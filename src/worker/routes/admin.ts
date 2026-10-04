/**
 * WS5 — admin war room API (PRD §4.2 M6).
 *
 * Auth: `POST /login` compares ADMIN_PASSWORD timing-safely and sets an
 * HMAC-signed HttpOnly session cookie (12 h); `POST /logout` clears it. Every
 * other route requires a valid session.
 *
 * All reads accept `?includeSimulated=true|false` (default false) and report
 * simulated rows separately. Campaign day boundaries use IST (+05:30) because
 * the campaign and its 9 PM review run on India time.
 */
import { Hono } from "hono";
import { z } from "zod";
import {
  AdminAiUsageSchema,
  AdminLoginRequestSchema,
  CreateAmbassadorRequestSchema,
  FlagDecisionRequestSchema,
  type AdminAmbassadorRow,
  type AdminCollegeRow,
  type AdminOverview,
  type ChannelRow,
  type DailyBrief,
  type FlagRow,
  type FunnelStep,
  type PacingPoint,
  type PacingResponse,
  type VariantRow,
} from "../../shared/contracts";
import {
  ADMIN_SESSION_HOURS,
  AI_MODELS,
  COOKIE_ADMIN,
  DEFAULT_GRAD_YEAR,
  FUNNEL_STEPS,
  RATE_LIMITS,
  WHATSAPP_VARIANTS,
} from "../../shared/constants";
import { ERROR_CODES } from "../../shared/errors";
import { DAY_MS, PACING, plannedCumulative, projectFinalTotal, TARGET_REGISTRATIONS } from "../../shared/plan";
import type { AppContext, AppEnv } from "../env";
import { runAiJson } from "../lib/ai";
import {
  buildClearCookie,
  buildSetCookie,
  hashIp,
  hashToken,
  isAdmin,
  signAdminSession,
  timingSafeEqual,
} from "../lib/auth";
import { all, count, first, nowIso, run, simFilter } from "../lib/db";
import { recordEvent } from "../lib/events";
import { apiError, json, parseJsonBody } from "../lib/http";
import { newId, newToken, nextSeatNo, randomBase32, refCodeFromName } from "../lib/ids";
import { clientIp, rateLimit } from "../lib/ratelimit";

const app = new Hono<AppContext>();

const IST_OFFSET_MS = 330 * 60_000;
/** SQLite expression that buckets an ISO-8601 UTC timestamp into an IST date. */
const IST_DATE_SQL = "date(created_at, '+330 minutes')";

const BriefSummarySchema = z.object({ summary: z.string().min(1).max(600) });

type AdminAiUsage = z.infer<typeof AdminAiUsageSchema>;

/* ------------------------------- small helpers ------------------------------ */

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function parseIncludeSimulated(request: Request): boolean {
  return new URL(request.url).searchParams.get("includeSimulated") === "true";
}

function targetOf(env: AppEnv): number {
  const value = Number(env.TARGET_REGISTRATIONS ?? TARGET_REGISTRATIONS);
  return Number.isFinite(value) && value > 0 ? value : TARGET_REGISTRATIONS;
}

function studentWhere(includeSimulated: boolean, alias = ""): string {
  const prefix = alias ? `${alias}.` : "";
  return `${prefix}role = 'student'${simFilter(includeSimulated, `${prefix}is_simulated`)}`;
}

function istDateKey(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function istDayStartMs(dateKey: string): number {
  return Date.parse(`${dateKey}T00:00:00+05:30`);
}

function addCalendarDays(dateKey: string, days: number): string {
  return new Date(Date.parse(`${dateKey}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** IST calendar dates of campaign day 1..N, anchored so day N contains the workshop. */
function campaignDates(workshopIso: string): string[] {
  const workshopDate = istDateKey(Date.parse(workshopIso));
  const firstDay = addCalendarDays(workshopDate, -(PACING.length - 1));
  return PACING.map((_, index) => addCalendarDays(firstDay, index));
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function randomDigits(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => String(byte % 10)).join("");
}

/* --------------------------------- read data -------------------------------- */

async function overviewData(
  db: D1Database,
  includeSimulated: boolean,
  target: number,
): Promise<AdminOverview> {
  const where = studentWhere(includeSimulated);
  const registrations = await count(db, `SELECT COUNT(*) AS n FROM users WHERE ${where}`);
  const referred = await count(
    db,
    `SELECT COUNT(*) AS n FROM users WHERE ${where} AND referred_by IS NOT NULL`,
  );
  const colleges = await count(
    db,
    `SELECT COUNT(DISTINCT college_id) AS n FROM users WHERE ${where} AND college_id IS NOT NULL`,
  );
  const qualifiedReferrals = await count(
    db,
    `SELECT COUNT(*) AS n FROM referrals WHERE status = 'qualified'${simFilter(includeSimulated)}`,
  );
  const todayRegistrations = await count(
    db,
    `SELECT COUNT(*) AS n FROM users WHERE ${where} AND ${IST_DATE_SQL} = ?`,
    istDateKey(Date.now()),
  );
  const simulatedCount = await count(
    db,
    "SELECT COUNT(*) AS n FROM users WHERE role = 'student' AND is_simulated = 1",
  );
  return {
    registrations,
    target,
    todayRegistrations,
    referralSharePct: registrations > 0 ? round1((referred / registrations) * 100) : 0,
    colleges,
    qualifiedReferrals,
    simulatedCount,
    includeSimulated,
  };
}

async function pacingData(
  db: D1Database,
  workshopIso: string,
  includeSimulated: boolean,
): Promise<PacingResponse> {
  const dates = campaignDates(workshopIso);
  const rows = await all<{ d: string; n: number }>(
    db,
    `SELECT ${IST_DATE_SQL} AS d, COUNT(*) AS n FROM users WHERE ${studentWhere(includeSimulated)} GROUP BY d`,
  );
  const points: PacingPoint[] = dates.map((date, index) => ({
    day: index + 1,
    date,
    plannedCumulative: plannedCumulative(index + 1),
    actualCumulative: rows.reduce((sum, row) => (row.d <= date ? sum + row.n : sum), 0),
  }));
  const total = await count(db, `SELECT COUNT(*) AS n FROM users WHERE ${studentWhere(includeSimulated)}`);
  const dayFraction = (Date.now() - istDayStartMs(dates[0])) / DAY_MS;
  const currentDay = Math.max(0, Math.min(PACING.length, Math.floor(dayFraction) + 1));
  return {
    points,
    projectedTotal: projectFinalTotal(total, dayFraction),
    currentDay,
    includeSimulated,
  };
}

async function funnelData(db: D1Database, includeSimulated: boolean): Promise<FunnelStep[]> {
  const steps: FunnelStep[] = [];
  let previous: number | null = null;
  for (const step of FUNNEL_STEPS) {
    const n =
      step.key === "referral_registered"
        ? await count(db, `SELECT COUNT(*) AS n FROM referrals WHERE 1 = 1${simFilter(includeSimulated)}`)
        : await count(
            db,
            `SELECT COUNT(*) AS n FROM events WHERE type = ?${simFilter(includeSimulated)}`,
            step.key,
          );
    steps.push({
      key: step.key,
      label: step.label,
      count: n,
      conversionFromPrev: previous === null || previous === 0 ? null : round1((n / previous) * 100),
    });
    previous = n;
  }
  return steps;
}

async function channelRows(db: D1Database, includeSimulated: boolean): Promise<ChannelRow[]> {
  const rows = await all<{ channel: string; registrations: number }>(
    db,
    `SELECT
       CASE
         WHEN referred_by IS NOT NULL THEN 'Referral'
         WHEN utm_source IS NOT NULL AND utm_medium IS NOT NULL THEN utm_source || ' / ' || utm_medium
         WHEN utm_source IS NOT NULL THEN utm_source
         WHEN utm_medium IS NOT NULL THEN utm_medium
         ELSE 'Direct / unknown'
       END AS channel,
       COUNT(*) AS registrations
     FROM users
     WHERE ${studentWhere(includeSimulated)}
     GROUP BY channel
     ORDER BY registrations DESC, channel ASC`,
  );
  const total = rows.reduce((sum, row) => sum + row.registrations, 0);
  return rows.map((row) => ({
    channel: row.channel,
    registrations: row.registrations,
    sharePct: total > 0 ? round1((row.registrations / total) * 100) : 0,
  }));
}

async function collegeRows(db: D1Database, includeSimulated: boolean): Promise<AdminCollegeRow[]> {
  const uFilter = simFilter(includeSimulated, "u.is_simulated");
  const rFilter = simFilter(includeSimulated, "r.is_simulated");
  const aFilter = simFilter(includeSimulated, "a.is_simulated");

  const known = await all<{
    collegeId: string;
    name: string;
    shortName: string;
    registrations: number;
    qualified: number;
    ambassadors: number;
  }>(
    db,
    `SELECT c.id AS collegeId, c.name AS name, c.short_name AS shortName,
       COUNT(DISTINCT u.id) AS registrations,
       COUNT(DISTINCT CASE WHEN r.status = 'qualified' THEN u.id END) AS qualified,
       COUNT(DISTINCT a.id) AS ambassadors
     FROM colleges c
     LEFT JOIN users u ON u.college_id = c.id AND u.role = 'student'${uFilter}
     LEFT JOIN referrals r ON r.referee_id = u.id${rFilter}
     LEFT JOIN users a ON a.college_id = c.id AND a.role = 'ambassador'${aFilter}
     GROUP BY c.id, c.name, c.short_name`,
  );

  const other = await all<{
    name: string;
    registrations: number;
    qualified: number;
    ambassadors: number;
  }>(
    db,
    `SELECT u.college_other AS name,
       COUNT(DISTINCT u.id) AS registrations,
       COUNT(DISTINCT CASE WHEN r.status = 'qualified' THEN u.id END) AS qualified,
       COUNT(DISTINCT a.id) AS ambassadors
     FROM users u
     LEFT JOIN referrals r ON r.referee_id = u.id${rFilter}
     LEFT JOIN users a ON a.college_id IS NULL AND a.college_other = u.college_other AND a.role = 'ambassador'${aFilter}
     WHERE u.college_id IS NULL AND u.college_other IS NOT NULL AND u.role = 'student'${uFilter}
     GROUP BY u.college_other`,
  );

  const rows: AdminCollegeRow[] = [
    ...known.map((row) => ({
      collegeId: row.collegeId,
      name: row.name,
      shortName: row.shortName,
      registrations: row.registrations,
      qualified: row.qualified,
      ambassadors: row.ambassadors,
      hasAmbassador: row.ambassadors > 0,
    })),
    ...other.map((row) => ({
      collegeId: null,
      name: row.name,
      shortName: row.name,
      registrations: row.registrations,
      qualified: row.qualified,
      ambassadors: row.ambassadors,
      hasAmbassador: row.ambassadors > 0,
    })),
  ];
  rows.sort((a, b) => b.registrations - a.registrations || a.name.localeCompare(b.name));
  return rows;
}

async function ambassadorRows(
  db: D1Database,
  includeSimulated: boolean,
): Promise<AdminAmbassadorRow[]> {
  const rows = await all<{
    userId: string;
    name: string;
    college: string | null;
    code: string;
    registrations: number;
    qualified: number;
    lastActivityAt: string | null;
  }>(
    db,
    `SELECT u.id AS userId, u.name AS name,
       COALESCE(c.name, u.college_other) AS college,
       u.ref_code AS code,
       COUNT(r.id) AS registrations,
       COALESCE(SUM(CASE WHEN r.status = 'qualified' THEN 1 ELSE 0 END), 0) AS qualified,
       MAX(r.created_at) AS lastActivityAt
     FROM users u
     LEFT JOIN colleges c ON c.id = u.college_id
     LEFT JOIN referrals r ON r.referrer_id = u.id${simFilter(includeSimulated, "r.is_simulated")}
     WHERE u.role = 'ambassador'${simFilter(includeSimulated, "u.is_simulated")}
     GROUP BY u.id
     ORDER BY registrations DESC, qualified DESC, u.name ASC`,
  );
  return rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    college: row.college,
    code: row.code,
    registrations: row.registrations,
    qualified: row.qualified,
    lastActivityAt: row.lastActivityAt,
    kitPath: `/ambassador/${row.code}`,
  }));
}

async function variantRows(db: D1Database, includeSimulated: boolean): Promise<VariantRow[]> {
  const registrations = await all<{ variant: string; n: number }>(
    db,
    `SELECT share_variant AS variant, COUNT(*) AS n
     FROM users
     WHERE ${studentWhere(includeSimulated)} AND share_variant IS NOT NULL
     GROUP BY share_variant`,
  );
  const landings = await all<{ variant: string | null; n: number }>(
    db,
    `SELECT CASE WHEN json_valid(props) THEN COALESCE(json_extract(props, '$.v'), json_extract(props, '$.variant')) END AS variant,
       COUNT(*) AS n
     FROM events
     WHERE type = 'referral_landing' AND props IS NOT NULL${simFilter(includeSimulated)}
     GROUP BY variant`,
  );

  const registrationByVariant = new Map(registrations.map((row) => [row.variant, row.n]));
  const landingByVariant = new Map<string, number>();
  for (const row of landings) {
    if (!row.variant) continue;
    landingByVariant.set(row.variant, (landingByVariant.get(row.variant) ?? 0) + row.n);
  }

  const known = [...WHATSAPP_VARIANTS] as string[];
  const extras = [...landingByVariant.keys()]
    .filter((variant) => !known.includes(variant))
    .sort((a, b) => a.localeCompare(b));
  return [...known, ...extras].map((variant) => {
    const landingsCount = landingByVariant.get(variant) ?? 0;
    const registrationCount = registrationByVariant.get(variant) ?? 0;
    return {
      variant,
      landings: landingsCount,
      registrations: registrationCount,
      conversionPct: landingsCount > 0 ? round1((registrationCount / landingsCount) * 100) : 0,
    };
  });
}

async function flagRows(db: D1Database, includeSimulated: boolean): Promise<FlagRow[]> {
  return all<FlagRow>(
    db,
    `SELECT id AS userId, name, email, phone,
       COALESCE(flag_reason, 'flagged') AS reason,
       flag_status AS status, created_at AS createdAt
     FROM users
     WHERE flag_status IS NOT NULL${simFilter(includeSimulated)}
     ORDER BY CASE flag_status WHEN 'open' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
       created_at DESC`,
  );
}

async function aiUsageData(db: D1Database, includeSimulated: boolean): Promise<AdminAiUsage> {
  const rows = await all<{ kind: string | null; n: number }>(
    db,
    `SELECT CASE WHEN json_valid(props) THEN json_extract(props, '$.kind') END AS kind, COUNT(*) AS n
     FROM events
     WHERE type = 'ai_call' AND ${IST_DATE_SQL} = ?${simFilter(includeSimulated)}
     GROUP BY kind
     ORDER BY n DESC`,
    istDateKey(Date.now()),
  );
  const byKind: Record<string, number> = {};
  let callsToday = 0;
  for (const row of rows) {
    const kind = row.kind ?? "unknown";
    byKind[kind] = (byKind[kind] ?? 0) + row.n;
    callsToday += row.n;
  }
  return { callsToday, byKind };
}

/* -------------------------------- auth routes ------------------------------- */

app.post("/login", async (c) => {
  if (!c.env.ADMIN_PASSWORD || !c.env.SESSION_SECRET) {
    return apiError(
      ERROR_CODES.UNAUTHORIZED,
      "Admin access is not configured. Set ADMIN_PASSWORD and SESSION_SECRET secrets.",
    );
  }
  const limit = await rateLimit(
    c.env.CACHE,
    `admin-login:${await hashIp(clientIp(c.req.raw), c.env.SESSION_SECRET)}`,
    RATE_LIMITS.adminLogin.limit,
    RATE_LIMITS.adminLogin.windowSeconds,
  );
  if (!limit.ok) return apiError(ERROR_CODES.RATE_LIMITED);

  const parsed = await parseJsonBody(c.req.raw, AdminLoginRequestSchema);
  if (!parsed.ok) return parsed.response;
  if (!timingSafeEqual(parsed.data.password, c.env.ADMIN_PASSWORD)) {
    return apiError(ERROR_CODES.UNAUTHORIZED, "Incorrect password.");
  }

  const session = await signAdminSession(c.env.SESSION_SECRET);
  return json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": buildSetCookie(COOKIE_ADMIN, session, {
          maxAgeSeconds: ADMIN_SESSION_HOURS * 3600,
        }),
      },
    },
  );
});

app.post("/logout", () =>
  json({ ok: true }, { headers: { "Set-Cookie": buildClearCookie(COOKIE_ADMIN) } }),
);

/** Public under /api/admin: login and logout (mount-agnostic path check). */
const PUBLIC_PATHS = new Set(["/login", "/logout", "/api/admin/login", "/api/admin/logout"]);

app.use("*", async (c, next) => {
  if (!PUBLIC_PATHS.has(c.req.path)) {
    if (!c.env.ADMIN_PASSWORD || !c.env.SESSION_SECRET) {
      return apiError(
        ERROR_CODES.UNAUTHORIZED,
        "Admin access is not configured. Set ADMIN_PASSWORD and SESSION_SECRET secrets.",
      );
    }
    if (!(await isAdmin(c.req.raw, c.env))) {
      return apiError(ERROR_CODES.UNAUTHORIZED, "Admin sign-in required.");
    }
  }
  await next();
});

/* --------------------------------- read routes ------------------------------- */

app.get("/overview", async (c) => {
  const includeSimulated = parseIncludeSimulated(c.req.raw);
  return json(await overviewData(c.env.DB, includeSimulated, targetOf(c.env)));
});

app.get("/pacing", async (c) => {
  const includeSimulated = parseIncludeSimulated(c.req.raw);
  return json(await pacingData(c.env.DB, c.env.WORKSHOP_START_ISO, includeSimulated));
});

app.get("/funnel", async (c) => {
  return json(await funnelData(c.env.DB, parseIncludeSimulated(c.req.raw)));
});

app.get("/channels", async (c) => {
  return json(await channelRows(c.env.DB, parseIncludeSimulated(c.req.raw)));
});

app.get("/colleges", async (c) => {
  return json(await collegeRows(c.env.DB, parseIncludeSimulated(c.req.raw)));
});

app.get("/ambassadors", async (c) => {
  return json(await ambassadorRows(c.env.DB, parseIncludeSimulated(c.req.raw)));
});

app.get("/variants", async (c) => {
  return json(await variantRows(c.env.DB, parseIncludeSimulated(c.req.raw)));
});

app.get("/flags", async (c) => {
  return json(await flagRows(c.env.DB, parseIncludeSimulated(c.req.raw)));
});

app.get("/ai-usage", async (c) => {
  return json(await aiUsageData(c.env.DB, parseIncludeSimulated(c.req.raw)));
});

/* --------------------------------- write routes ------------------------------ */

app.post("/ambassadors", async (c) => {
  const parsed = await parseJsonBody(c.req.raw, CreateAmbassadorRequestSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const db = c.env.DB;

  const collegeId = body.collegeId?.trim() || null;
  const collegeOther = body.collegeOther?.trim() || null;
  if (collegeId) {
    const college = await first<{ name: string }>(db, "SELECT name FROM colleges WHERE id = ?", collegeId);
    if (!college) return apiError(ERROR_CODES.INVALID_INPUT, "That college does not exist.");
  }

  const email = body.email?.trim().toLowerCase() || `amb-${randomBase32(10).toLowerCase()}@ship60.example`;
  const phone = body.phone?.trim() || `+9190${randomDigits(8)}`;
  const tokenHash = await hashToken(newToken());
  const now = nowIso();

  let refCode = "";
  let created = false;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    refCode = refCodeFromName(body.name);
    const seatNo = await nextSeatNo(db);
    try {
      await run(
        db,
        `INSERT INTO users (
           id, name, email, phone, college_id, college_other, branch, grad_year, role,
           ref_code, referred_by, token_hash, seat_no, idea_key,
           utm_source, utm_medium, utm_campaign, utm_content, share_variant,
           ip_hash, user_agent, consent_at, flag_reason, flag_status, is_simulated, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, 'Other', ?, 'ambassador', ?, NULL, ?, ?, NULL,
           NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, NULL, NULL, 0, ?)`,
        newId("u"),
        body.name,
        email,
        phone,
        collegeId,
        collegeOther,
        DEFAULT_GRAD_YEAR,
        refCode,
        tokenHash,
        seatNo,
        now,
        now,
      );
      created = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/UNIQUE constraint failed: users\.(ref_code|seat_no)/i.test(message)) continue;
      if (/UNIQUE constraint failed: users\.(email|phone)/i.test(message)) {
        return apiError(ERROR_CODES.DUPLICATE, "An account with that email or phone already exists.");
      }
      throw error;
    }
  }
  if (!created) {
    return apiError(ERROR_CODES.INTERNAL, "Could not allocate a unique ambassador code.");
  }

  const collegeName = collegeId
    ? (await first<{ name: string }>(db, "SELECT name FROM colleges WHERE id = ?", collegeId))?.name ?? null
    : null;
  const row: AdminAmbassadorRow = {
    userId: "",
    name: body.name,
    college: collegeName ?? collegeOther,
    code: refCode,
    registrations: 0,
    qualified: 0,
    lastActivityAt: null,
    kitPath: `/ambassador/${refCode}`,
  };
  const saved = await first<{ id: string }>(db, "SELECT id FROM users WHERE ref_code = ?", refCode);
  if (saved) row.userId = saved.id;
  return json(row, { status: 201 });
});

app.post("/flags/:id", async (c) => {
  const userId = c.req.param("id");
  const parsed = await parseJsonBody(c.req.raw, FlagDecisionRequestSchema);
  if (!parsed.ok) return parsed.response;
  const db = c.env.DB;

  const user = await first<{ flag_status: string | null }>(
    db,
    "SELECT flag_status FROM users WHERE id = ?",
    userId,
  );
  if (!user || !user.flag_status) {
    return apiError(ERROR_CODES.NOT_FOUND, "No flagged user with that id.");
  }

  const status = parsed.data.decision === "approve" ? "approved" : "rejected";
  await run(db, "UPDATE users SET flag_status = ? WHERE id = ?", status, userId);
  if (parsed.data.decision === "reject") {
    // Pending referrals involving the flagged account are rejected. Qualified
    // rows are kept because a check-in is stronger evidence than a heuristic.
    await run(
      db,
      `UPDATE referrals SET status = 'rejected'
       WHERE status = 'pending' AND (referrer_id = ? OR referee_id = ?)`,
      userId,
      userId,
    );
  }
  return json({ ok: true });
});

/* --------------------------------- daily brief ------------------------------- */

app.get("/brief", async (c) => {
  const includeSimulated = parseIncludeSimulated(c.req.raw);
  const db = c.env.DB;
  const [overview, pacing, colleges, variants, flags] = await Promise.all([
    overviewData(db, includeSimulated, targetOf(c.env)),
    pacingData(db, c.env.WORKSHOP_START_ISO, includeSimulated),
    collegeRows(db, includeSimulated),
    variantRows(db, includeSimulated),
    flagRows(db, includeSimulated),
  ]);

  const currentDay = Math.max(1, pacing.currentDay || 1);
  const planned = plannedCumulative(currentDay);
  const actual = pacing.points[currentDay - 1]?.actualCumulative ?? 0;
  const pacingPct = planned > 0 ? round1((actual / planned) * 100) : 0;

  const lines: string[] = [];
  if (pacingPct < 80) {
    const zeroColleges = colleges
      .filter((college) => college.registrations === 0)
      .slice(0, 5)
      .map((college) => college.name);
    lines.push(
      zeroColleges.length > 0
        ? `Pacing is at ${pacingPct}% of plan (${actual} of ${planned} by day ${currentDay}) — recruit ambassadors at these ${zeroColleges.length} colleges with zero registrations: ${zeroColleges.join(", ")}.`
        : `Pacing is at ${pacingPct}% of plan (${actual} of ${planned} by day ${currentDay}); every college already has a registration — push the referral loop.`,
    );
  } else {
    lines.push(`Pacing is at ${pacingPct}% of plan (${actual} of ${planned} by day ${currentDay}).`);
  }

  const withRegistrations = colleges.filter((college) => college.registrations > 0);
  if (withRegistrations.length > 0) {
    const best = withRegistrations[0];
    const worst = withRegistrations[withRegistrations.length - 1];
    lines.push(`Best college: ${best.name} (${best.registrations} registrations).`);
    if (worst.collegeId !== best.collegeId || worst.name !== best.name) {
      lines.push(`Needs attention: ${worst.name} (${worst.registrations} registrations).`);
    }
  }

  const topVariant = variants
    .filter((variant) => variant.landings > 0)
    .sort((a, b) => b.conversionPct - a.conversionPct || b.landings - a.landings)[0];
  lines.push(
    topVariant
      ? `Top share variant: ${topVariant.variant} — ${topVariant.conversionPct}% conversion from ${topVariant.landings} landings.`
      : "No share-variant landings yet.",
  );

  const openFlags = flags.filter((flag) => flag.status === "open").length;
  lines.push(
    openFlags > 0
      ? `${openFlags} flagged signup${openFlags === 1 ? "" : "s"} awaiting review.`
      : "No flagged signups awaiting review.",
  );

  const topChannel = (await channelRows(db, includeSimulated))[0];
  const facts = [
    `Campaign day ${currentDay} of ${PACING.length}.`,
    `Registrations ${overview.registrations} vs target ${overview.target}; planned by now ${planned}; pacing ${pacingPct}%.`,
    `Qualified referrals ${overview.qualifiedReferrals}; referral share ${overview.referralSharePct}%.`,
    topChannel ? `Top channel ${topChannel.channel} with ${topChannel.registrations}.` : "",
    withRegistrations[0] ? `Best college ${withRegistrations[0].name} with ${withRegistrations[0].registrations}.` : "",
    topVariant ? `Top share variant ${topVariant.variant} at ${topVariant.conversionPct}% conversion.` : "",
    `Open flags ${openFlags}.`,
  ]
    .filter(Boolean)
    .join(" ");

  let aiParagraph: string | null = null;
  let aiAvailable = false;
  let aiSource = "fallback";
  let aiAttempts = 0;
  let aiMs = 0;
  try {
    const result = await runAiJson<{ summary: string }>({
      ai: c.env.AI,
      model: AI_MODELS.brief,
      messages: [
        {
          role: "system",
          content:
            'You are a growth analyst for an Indian campus workshop. Given today\'s numbers, write one short paragraph (max 90 words) naming the single most useful next action. Reply with JSON only, shaped as {"summary":"..."}.',
        },
        {
          role: "user",
          content: includeSimulated
            ? `Numbers (SIMULATED DEMO DATA — say so explicitly in your summary): ${facts}`
            : `Numbers: ${facts}`,
        },
      ],
      schema: BriefSummarySchema,
      fallback: () => ({ summary: "" }),
      maxTokens: 240,
      temperature: 0.4,
    });
    aiSource = result.source;
    aiAttempts = result.attempts;
    aiMs = result.ms;
    if (result.source === "ai" && result.data.summary.trim()) {
      aiParagraph = result.data.summary.trim().slice(0, 600);
      aiAvailable = true;
    }
  } catch {
    // Fall back to rule-based lines only.
  }
  try {
    await recordEvent(db, {
      type: "ai_call",
      props: { kind: "brief", source: aiSource, attempts: aiAttempts, ms: aiMs },
      isSimulated: false,
    });
  } catch {
    // AI usage tracking must never break the brief.
  }

  const brief: DailyBrief = { generatedAt: nowIso(), lines, aiParagraph, aiAvailable };
  return json(brief);
});

/* --------------------------------- CSV export -------------------------------- */

app.get("/export.csv", async (c) => {
  const includeSimulated = parseIncludeSimulated(c.req.raw);
  const headers = [
    "seat_no",
    "name",
    "email",
    "phone",
    "college",
    "college_other",
    "branch",
    "grad_year",
    "ref_code",
    "referred_by",
    "idea_key",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "share_variant",
    "flag_reason",
    "flag_status",
    "referral_status",
    "checked_in",
    "is_simulated",
    "created_at",
  ] as const;
  const rows = await all<Record<string, unknown>>(
    c.env.DB,
    `SELECT u.seat_no, u.name, u.email, u.phone,
       c.name AS college, u.college_other, u.branch, u.grad_year,
       u.ref_code, ru.ref_code AS referred_by, u.idea_key,
       u.utm_source, u.utm_medium, u.utm_campaign, u.utm_content, u.share_variant,
       u.flag_reason, u.flag_status, r.status AS referral_status,
       CASE WHEN ci.user_id IS NULL THEN 0 ELSE 1 END AS checked_in,
       u.is_simulated, u.created_at
     FROM users u
     LEFT JOIN colleges c ON c.id = u.college_id
     LEFT JOIN users ru ON ru.id = u.referred_by
     LEFT JOIN referrals r ON r.referee_id = u.id
     LEFT JOIN checkins ci ON ci.user_id = u.id
     WHERE u.role = 'student'${simFilter(includeSimulated, "u.is_simulated")}
     ORDER BY u.seat_no ASC`,
  );
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\r\n");
  const filename = `ship60-registrations-${istDateKey(Date.now())}.csv`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
});

app.all("*", (_c) => apiError(ERROR_CODES.NOT_FOUND, "No such admin route."));

export default app;
