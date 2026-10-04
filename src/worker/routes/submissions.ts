/**
 * WS7 — submissions API (`POST/GET /api/submissions`) and public certificate
 * pages (`/cert/:id`). PRD M9/M10.
 *
 * A bad live URL or a Workers AI outage never produces a 5xx: the submission is
 * saved with status `manual`/`failed` and a diagnostic payload, and the user
 * sees "saved for manual review".
 */
import { Hono } from "hono";
import { RATE_LIMITS } from "../../shared/constants";
import {
  EvaluationSchema,
  SubmissionRequestSchema,
  type CertificateResponse,
  type Evaluation,
  type SubmissionResponse,
} from "../../shared/contracts";
import { ERROR_CODES } from "../../shared/errors";
import { IDEA_BANK } from "../../shared/idea-bank";
import type { AppContext, AppEnv } from "../env";
import { getAuthedUser, publicName } from "../lib/auth";
import { count, first, nowIso, run, type SubmissionRow } from "../lib/db";
import { evaluateSubmission, fetchRepoContext, probeLivePage, validateTargetUrl } from "../lib/eval";
import { recordEvent } from "../lib/events";
import { apiError, html, json, parseJsonBody, resolvePublicBase } from "../lib/http";
import { newId } from "../lib/ids";
import { rateLimit } from "../lib/ratelimit";

const app = new Hono<AppContext>();

function shippedCardPath(submissionId: string): string {
  return `/og/shipped/${submissionId}.png`;
}

function toResponse(row: SubmissionRow): SubmissionResponse {
  let evaluation: Evaluation | null = null;
  if (row.status === "evaluated" && row.evaluation) {
    try {
      const parsed = EvaluationSchema.safeParse(JSON.parse(row.evaluation));
      if (parsed.success) evaluation = parsed.data;
    } catch {
      evaluation = null;
    }
  }
  return {
    id: row.id,
    status: row.status,
    score: row.score,
    evaluation,
    certId: row.cert_id,
    shippedCardPath: shippedCardPath(row.id),
  };
}

async function issueCertId(db: D1Database, userId: string): Promise<string> {
  const existing = await first<{ cert_id: string }>(
    db,
    "SELECT cert_id FROM submissions WHERE user_id = ? AND cert_id IS NOT NULL ORDER BY created_at LIMIT 1",
    userId,
  );
  return existing?.cert_id ?? newId("cert");
}

/* -------------------------------- POST / --------------------------------- */

app.post("/", async (c) => {
  const user = await getAuthedUser(c.req.raw, c.env);
  if (!user) return apiError(ERROR_CODES.UNAUTHORIZED, "Register and open your Launchpad first.");

  const limit = await rateLimit(
    c.env.CACHE,
    `submissions:${user.id}`,
    RATE_LIMITS.submissions.limit,
    RATE_LIMITS.submissions.windowSeconds,
  );
  if (!limit.ok) {
    return apiError(ERROR_CODES.RATE_LIMITED, "You can submit up to 3 projects per hour.", {
      "retry-after": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))),
    });
  }

  const body = await parseJsonBody(c.req.raw, SubmissionRequestSchema);
  if (!body.ok) return body.response;
  const { liveUrl, description } = body.data;
  const repoUrl = typeof body.data.repoUrl === "string" && body.data.repoUrl.length > 0 ? body.data.repoUrl : null;

  const guard = await validateTargetUrl(liveUrl);
  if (!guard.ok) return apiError(ERROR_CODES.INVALID_INPUT, guard.reason);

  const id = newId("sub");
  await run(
    c.env.DB,
    `INSERT INTO submissions (id, user_id, live_url, repo_url, description, status, score, evaluation, cert_id, is_simulated, created_at)
     VALUES (?, ?, ?, ?, ?, 'queued', NULL, NULL, NULL, 0, ?)`,
    id,
    user.id,
    liveUrl,
    repoUrl,
    description,
    nowIso(),
  );

  try {
    let status: SubmissionRow["status"] = "manual";
    let evaluation: Evaluation | null = null;
    let diagnostic: Record<string, unknown> | null = null;

    const probe = await probeLivePage(liveUrl);
    const repo = repoUrl ? await fetchRepoContext(repoUrl, c.env.GITHUB_TOKEN) : null;

    if (!probe.ok) {
      diagnostic = {
        code: ERROR_CODES.EVALUATION_UNAVAILABLE,
        message: `Live page check failed: ${probe.error ?? "unknown error"}`,
      };
    } else {
      const outcome = await evaluateSubmission(c.env.AI, { description, live: probe, repo });
      if (outcome.evaluation) {
        status = "evaluated";
        evaluation = outcome.evaluation;
      } else {
        diagnostic = {
          code: ERROR_CODES.EVALUATION_UNAVAILABLE,
          message: "Evaluation unavailable — saved for manual review.",
          source: outcome.source,
          attempts: outcome.attempts,
        };
      }
      await recordEvent(c.env.DB, {
        type: "ai_call",
        userId: user.id,
        props: {
          kind: "evaluator",
          submissionId: id,
          source: outcome.source,
          attempts: outcome.attempts,
          ms: outcome.ms,
        },
      }).catch(() => undefined);
    }

    let certId: string | null = null;
    if (status === "evaluated") {
      const checkins = await count(c.env.DB, "SELECT COUNT(*) AS n FROM checkins WHERE user_id = ?", user.id);
      if (checkins > 0) certId = await issueCertId(c.env.DB, user.id);
    }

    await run(
      c.env.DB,
      "UPDATE submissions SET status = ?, score = ?, evaluation = ?, cert_id = ? WHERE id = ?",
      status,
      evaluation?.score ?? null,
      evaluation ? JSON.stringify(evaluation) : diagnostic ? JSON.stringify(diagnostic) : null,
      certId,
      id,
    );
    await recordEvent(c.env.DB, {
      type: "submitted",
      userId: user.id,
      props: {
        submissionId: id,
        status,
        score: evaluation?.score ?? null,
        ...(diagnostic ? { manualReason: diagnostic.message } : {}),
      },
    }).catch(() => undefined);

    const response: SubmissionResponse = {
      id,
      status,
      score: evaluation?.score ?? null,
      evaluation,
      certId,
      shippedCardPath: shippedCardPath(id),
    };
    return json(response);
  } catch (error) {
    console.error("[submissions] evaluation failed", error);
    const diagnostic = { code: ERROR_CODES.INTERNAL, message: "Evaluation crashed; saved for manual review." };
    await run(c.env.DB, "UPDATE submissions SET status = 'failed', evaluation = ? WHERE id = ?", JSON.stringify(diagnostic), id).catch(
      () => undefined,
    );
    await recordEvent(c.env.DB, {
      type: "submitted",
      userId: user.id,
      props: { submissionId: id, status: "failed", manualReason: diagnostic.message },
    }).catch(() => undefined);
    const response: SubmissionResponse = {
      id,
      status: "failed",
      score: null,
      evaluation: null,
      certId: null,
      shippedCardPath: shippedCardPath(id),
    };
    return json(response);
  }
});

/* -------------------------------- GET /:id -------------------------------- */

app.get("/:id", async (c) => {
  const user = await getAuthedUser(c.req.raw, c.env);
  if (!user) return apiError(ERROR_CODES.UNAUTHORIZED);

  const row = await first<SubmissionRow>(c.env.DB, "SELECT * FROM submissions WHERE id = ?", c.req.param("id"));
  if (!row || row.user_id !== user.id) return apiError(ERROR_CODES.NOT_FOUND, "Submission not found.");
  return json(toResponse(row));
});

/* ----------------------------- public certificate -------------------------- */

interface CertificateRow {
  cert_id: string;
  status: string;
  created_at: string;
  user_name: string;
  idea_key: string | null;
  college_name: string | null;
  college_other: string | null;
  is_simulated: number;
}

export function projectTitleFromIdeaKey(ideaKey: string | null): string | null {
  if (!ideaKey) return null;
  let bankKey = ideaKey;
  if (!ideaKey.includes("|")) {
    const parts = ideaKey.split(":");
    if (parts.length < 4 || parts[0] !== "idea") return null;
    bankKey = `${parts[1]}|${parts[2]}`;
  }
  return IDEA_BANK[bankKey]?.title ?? null;
}

async function loadCertificate(db: D1Database, env: AppEnv, certId: string): Promise<CertificateResponse | null> {
  const row = await first<CertificateRow>(
    db,
    `SELECT s.cert_id AS cert_id, s.status AS status, s.created_at AS created_at,
            s.is_simulated AS is_simulated,
            u.name AS user_name, u.idea_key AS idea_key,
            c.name AS college_name, u.college_other AS college_other
     FROM submissions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN colleges c ON c.id = u.college_id
     WHERE s.cert_id = ?
     LIMIT 1`,
    certId,
  );
  if (!row?.cert_id) return null;
  return {
    certId: row.cert_id,
    name: publicName(row.user_name),
    college: row.college_name ?? row.college_other ?? null,
    projectTitle: projectTitleFromIdeaKey(row.idea_key),
    issuedAt: row.created_at,
    workshopId: env.WORKSHOP_ID,
    valid: row.status === "evaluated",
    isSimulated: row.is_simulated === 1,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatIssuedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(date);
}

function certPage(cert: CertificateResponse, baseUrl: string): string {
  const title = cert.projectTitle ? `${cert.name} — ${cert.projectTitle}` : `${cert.name} — Ship60 certificate`;
  const description = cert.projectTitle
    ? `${cert.name} built "${cert.projectTitle}" in NxtWave's 60-minute AI workshop.`
    : `${cert.name} completed NxtWave's 60-minute AI workshop.`;
  const url = `${baseUrl.replace(/\/$/, "")}/cert/${encodeURIComponent(cert.certId)}`;
  const college = cert.college ?? "NxtWave workshop";
  const statusLabel = cert.valid ? "Verified certificate" : "Verification pending";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:image" content="${escapeHtml(baseUrl.replace(/\/$/, ""))}/og/default.png" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="${escapeHtml(url)}" />
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Atkinson Hyperlegible", system-ui, sans-serif; background: #fbfcfe; color: #2e333b; }
  main { max-width: 560px; margin: 0 auto; padding: 40px 20px 64px; }
  .card { border: 1px solid #dde5f2; border-radius: 12px; background: #fff; padding: 28px 22px; box-shadow: 0 1px 0 #dde5f2; }
  .eyebrow { color: #1f3a93; font-weight: 700; letter-spacing: 0.02em; font-size: 14px; margin: 0 0 6px; }
  h1 { font-size: 26px; margin: 0 0 4px; line-height: 1.2; }
  .project { font-size: 18px; margin: 18px 0 2px; }
  .highlight { background: #ffe45c; padding: 0 4px; }
  .meta { font-size: 14px; color: #5a6472; margin: 6px 0; }
  .simulated { color: #b01731; font-weight: 700; }
  .badge { display: inline-block; margin-top: 14px; padding: 6px 10px; border-radius: 999px; font-size: 13px; font-weight: 700; }
  .badge.ok { background: #e7f6ec; color: #1d6b3a; }
  .badge.pending { background: #fdecef; color: #b01731; }
  .id { margin-top: 18px; font-size: 12px; color: #5a6472; word-break: break-all; }
  a { color: #1f3a93; }
  a.home { display: inline-block; margin-top: 22px; font-weight: 700; text-decoration: none; }
  @media (prefers-color-scheme: dark) {
    body { background: #12151c; color: #e6e9f0; }
    .card { background: #1a1f29; border-color: #2c3444; }
    .meta, .id { color: #9aa4b5; }
  }
</style>
</head>
<body>
<main>
  <section class="card">
    <p class="eyebrow">NxtWave · Ship60</p>
    <h1>Certificate of completion</h1>
    <p class="project"><strong>${escapeHtml(cert.name)}</strong></p>
    ${
      cert.projectTitle
        ? `<p class="project">built <span class="highlight">${escapeHtml(cert.projectTitle)}</span></p>`
        : ""
    }
    <p class="meta">${escapeHtml(college)}</p>
    <p class="meta">Issued ${escapeHtml(formatIssuedAt(cert.issuedAt))}</p>
    <p class="meta">Workshop ${escapeHtml(cert.workshopId)}</p>
    ${cert.isSimulated ? '<p class="meta simulated">Simulated data — this certificate belongs to a seeded demo row.</p>' : ""}
    <span class="badge ${cert.valid ? "ok" : "pending"}">${escapeHtml(statusLabel)}</span>
    <p class="id">Certificate id: ${escapeHtml(cert.certId)}<br />Verify any time at this address — ids are unique and unguessable.</p>
    <a class="home" href="${escapeHtml(baseUrl.replace(/\/$/, ""))}/">Build your first AI project in 60 minutes →</a>
  </section>
</main>
</body>
</html>`;
}

function certNotFoundPage(baseUrl: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Certificate not found — Ship60</title></head>
<body style="font-family: system-ui, sans-serif; padding: 40px 20px; max-width: 560px; margin: 0 auto;">
<h1>No certificate with that id</h1>
<p>Check the link, or ask the student to share their certificate id again.</p>
<p><a href="${escapeHtml(baseUrl.replace(/\/$/, ""))}/">Go to the workshop page</a></p>
</body>
</html>`;
}

export const certRoutes = new Hono<AppContext>();

certRoutes.get("/cert/:id", async (c) => {
  const id = c.req.param("id");
  if (id.endsWith(".png")) {
    return apiError(ERROR_CODES.NOT_FOUND, "Certificate images are not enabled yet.");
  }
  const cert = await loadCertificate(c.env.DB, c.env, id);
  const base = resolvePublicBase(c.env, c.req.raw);
  if (!cert) return html(certNotFoundPage(base), { status: 404 });
  return html(certPage(cert, base), {
    headers: { "cache-control": "public, max-age=300" },
  });
});

certRoutes.all("/cert/*", (_c) => apiError(ERROR_CODES.NOT_FOUND, "No such certificate route."));

/* ----------------------- JSON verification (client page) ------------------- */

app.get("/cert/:id", async (c) => {
  const cert = await loadCertificate(c.env.DB, c.env, c.req.param("id"));
  if (!cert) return apiError(ERROR_CODES.NOT_FOUND, "No certificate with that id.");
  return json(cert);
});

export default app;
