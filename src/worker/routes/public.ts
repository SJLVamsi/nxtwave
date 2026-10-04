/**
 * WS1 — public API: register, me, stats, leaderboards, events, colleges, ambassador kit.
 * All SQL is parameterised; every input is zod-validated (PRD §7).
 */
import { Hono } from "hono";
import {
  AmbassadorKitResponseSchema,
  EventRequestSchema,
  ICS_PATH,
  RegisterRequestSchema,
  RegisterResponseSchema,
  type CollegeLeaderboardRow,
  type CollegeOption,
  type LeaderboardResponse,
  type MeResponse,
  type StatsPublicResponse,
  type StudentLeaderboardRow,
} from "../../shared/contracts";
import {
  COOKIE_REF,
  COOKIE_TOKEN,
  DISPOSABLE_EMAIL_DOMAINS,
  LEADERBOARD_CACHE_SECONDS,
  MAX_FLAGGED_IPS_PER_HOUR,
  RATE_LIMITS,
  REWARD_TIERS,
  STATS_CACHE_SECONDS,
  TOKEN_COOKIE_DAYS,
} from "../../shared/constants";
import { ERROR_CODES } from "../../shared/errors";
import { TARGET_REGISTRATIONS } from "../../shared/plan";
import type { AppContext, AppEnv } from "../env";
import {
  buildSetCookie,
  firstName,
  getCookie,
  getUserFromRequest,
  hashIp,
  hashToken,
  ipHashSalt,
  publicName,
  sha256Hex,
} from "../lib/auth";
import { cachedJson } from "../lib/cache";
import { all, count, first, nowIso, run, toBool, type CollegeRow, type UserRow } from "../lib/db";
import { recordEvent } from "../lib/events";
import { apiError, json, parseJsonBody, resolvePublicBase } from "../lib/http";
import { resolveIdeaCard } from "../lib/idea-card";
import { newId, newToken, refCodeFromName, withSeatRetry } from "../lib/ids";
import { clientIp, rateLimit } from "../lib/ratelimit";

const app = new Hono<AppContext>();

/* --------------------------------- helpers -------------------------------- */

const INSERT_USER = `INSERT INTO users (
  id, name, email, phone, college_id, college_other, branch, grad_year, role,
  ref_code, referred_by, token_hash, seat_no, idea_key,
  utm_source, utm_medium, utm_campaign, utm_content, share_variant,
  ip_hash, user_agent, consent_at, flag_reason, flag_status, is_simulated, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`;

function baseUrl(env: AppEnv, request: Request): string {
  return resolvePublicBase(env, request);
}

function launchpadUrl(env: AppEnv, request: Request, token: string): string {
  return `${baseUrl(env, request)}/me?t=${encodeURIComponent(token)}`;
}

const TOKEN_MAX_AGE_SECONDS = TOKEN_COOKIE_DAYS * 86400;
const DUPLICATE_RATE_LIMIT = { limit: 10, windowSeconds: 3600 } as const;

function tokenSetCookie(token: string): string {
  return buildSetCookie(COOKIE_TOKEN, token, {
    maxAgeSeconds: TOKEN_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "Lax",
    secure: true,
    path: "/",
  });
}

function registerResponse(
  user: Pick<UserRow, "seat_no" | "ref_code" | "name">,
  token: string,
  isReturning: boolean,
  env: AppEnv,
  request: Request,
) {
  return RegisterResponseSchema.parse({
    seatNo: user.seat_no,
    refCode: user.ref_code,
    launchpadUrl: launchpadUrl(env, request, token),
    token,
    name: user.name,
    isReturning,
  });
}

async function findByEmailOrPhone(
  db: D1Database,
  email: string,
  phone: string,
): Promise<UserRow | null> {
  const byEmail = await first<UserRow>(db, "SELECT * FROM users WHERE email = ? LIMIT 1", email);
  if (byEmail) return byEmail;
  return first<UserRow>(db, "SELECT * FROM users WHERE phone = ? LIMIT 1", phone);
}

/**
 * A duplicate email/phone only ever returns a Launchpad when the request proves
 * ownership of that same user (s60_token cookie, Authorization: Bearer, or ?t=).
 * Without proof it mints nothing — otherwise knowing an email or phone number
 * would be enough to take over the account (reviews/security.md C1).
 */
async function returningResponse(
  db: D1Database,
  existing: UserRow,
  env: AppEnv,
  request: Request,
): Promise<Response> {
  const identifier = await sha256Hex(`${existing.email}|${existing.phone}`);
  const limited = await rateLimit(
    env.CACHE,
    `register-dup:${identifier}`,
    DUPLICATE_RATE_LIMIT.limit,
    DUPLICATE_RATE_LIMIT.windowSeconds,
  );
  if (!limited.ok) return apiError(ERROR_CODES.RATE_LIMITED);

  const proof = await getUserFromRequest(request, env);
  if (!proof || proof.id !== existing.id) {
    return apiError(
      ERROR_CODES.DUPLICATE,
      "This email or WhatsApp number already has a seat. Open your Launchpad from the link you saved.",
    );
  }

  const token = newToken();
  await run(db, "UPDATE users SET token_hash = ? WHERE id = ?", await hashToken(token), existing.id);
  return json(registerResponse(existing, token, true, env, request), {
    headers: { "set-cookie": tokenSetCookie(token) },
  });
}

async function verifyTurnstile(
  secret: string,
  token: string | undefined,
  ip: string,
): Promise<boolean> {
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return (DISPOSABLE_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

function referralCounts(db: D1Database, userId: string): Promise<{ total: number; qualified: number }> {
  return Promise.all([
    count(db, "SELECT COUNT(*) AS n FROM referrals WHERE referrer_id = ? AND is_simulated = 0", userId),
    count(
      db,
      "SELECT COUNT(*) AS n FROM referrals WHERE referrer_id = ? AND status = 'qualified' AND is_simulated = 0",
      userId,
    ),
  ]).then(([total, qualified]) => ({ total, qualified }));
}

function googleCalendarUrl(env: AppEnv): string {
  const start = new Date(env.WORKSHOP_START_ISO);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "Build Your First AI Project in 60 Minutes — NxtWave",
    dates: `${stamp(start)}/${stamp(end)}`,
    details:
      "Free live workshop by NxtWave. Build and deploy your first AI project in 60 minutes. Your join link is on your Launchpad.",
    location: "Online",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/* ---------------------------------- routes --------------------------------- */

app.get("/health", (_c) => json({ ok: true, service: "ship60" }));

app.post("/register", async (c) => {
  const parsed = await parseJsonBody(c.req.raw, RegisterRequestSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const db = c.env.DB;

  const ip = clientIp(c.req.raw);
  const ipHash = await hashIp(ip, ipHashSalt(c.env));
  const limited = await rateLimit(
    c.env.CACHE,
    `register:${ipHash}`,
    RATE_LIMITS.register.limit,
    RATE_LIMITS.register.windowSeconds,
  );
  if (!limited.ok) return apiError(ERROR_CODES.RATE_LIMITED);

  const secret = c.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Fail closed outside local dev: a deployed Worker without the secret must
    // not silently skip human verification (security review M1).
    if (c.env.ENVIRONMENT !== "development") {
      return apiError(
        ERROR_CODES.INTERNAL,
        "Registration is temporarily unavailable (verification is not configured).",
      );
    }
  } else if (!(await verifyTurnstile(secret, body.turnstileToken, ip))) {
    return apiError(ERROR_CODES.TURNSTILE_FAILED);
  }

  // Duplicate email/phone only returns the existing Launchpad when the request
  // proves ownership of that user; otherwise it is a 409 DUPLICATE (M1 / C1).
  const existing = await findByEmailOrPhone(db, body.email, body.phone);
  if (existing) return returningResponse(db, existing, c.env, c.req.raw);

  const collegeId = body.collegeId
    ? ((await first<CollegeRow>(db, "SELECT * FROM colleges WHERE id = ?", body.collegeId))?.id ?? null)
    : null;

  // Referral resolution: s60_ref cookie wins (first touch), then body refCode.
  const cookieRef = getCookie(c.req.raw, COOKIE_REF)?.trim() ?? "";
  const bodyRef = body.refCode?.trim() ?? "";
  let referrer: UserRow | null = null;
  for (const code of cookieRef ? [cookieRef, bodyRef] : [bodyRef]) {
    if (!code) continue;
    const candidate = await first<UserRow>(
      db,
      "SELECT * FROM users WHERE UPPER(ref_code) = ? AND is_simulated = 0 LIMIT 1",
      code.toUpperCase(),
    );
    if (!candidate) continue;
    if (candidate.email === body.email || candidate.phone === body.phone) break; // self-referral
    referrer = candidate;
    break;
  }

  // Fraud guards (PRD M2): flagged users still register; admins review them.
  let flagReason: string | null = null;
  const recentFromIp = await count(
    db,
    "SELECT COUNT(*) AS n FROM users WHERE ip_hash = ? AND is_simulated = 0 AND created_at >= ?",
    ipHash,
    new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  );
  if (recentFromIp >= MAX_FLAGGED_IPS_PER_HOUR) flagReason = "ip_velocity";
  else if (isDisposableEmail(body.email)) flagReason = "disposable_email";

  const createdAt = nowIso();
  const userId = newId("u");
  const userAgent = (c.req.header("user-agent") ?? "").slice(0, 300) || null;

  let inserted: { seatNo: number; refCode: string; token: string };
  try {
    inserted = await withSeatRetry(db, 5, async (seatNo) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const refCode = refCodeFromName(body.name);
        const token = newToken();
        const tokenHash = await hashToken(token);
        try {
          await run(
            db,
            INSERT_USER,
            userId,
            body.name,
            body.email,
            body.phone,
            collegeId,
            body.collegeOther ?? null,
            body.branch,
            body.gradYear,
            refCode,
            referrer?.id ?? null,
            tokenHash,
            seatNo,
            body.ideaKey ?? null,
            body.utmSource ?? null,
            body.utmMedium ?? null,
            body.utmCampaign ?? null,
            body.utmContent ?? null,
            referrer ? body.shareVariant ?? null : null,
            ipHash,
            userAgent,
            createdAt,
            flagReason,
            flagReason ? "open" : null,
            createdAt,
          );
          return { seatNo, refCode, token };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (/UNIQUE constraint failed: users\.(ref_code|token_hash)/i.test(message)) continue;
          throw error;
        }
      }
      throw new Error("Could not allocate a unique reference code");
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/UNIQUE constraint failed: users\.(email|phone)/i.test(message)) {
      const raced = await findByEmailOrPhone(db, body.email, body.phone);
      if (raced) return returningResponse(db, raced, c.env, c.req.raw);
    }
    throw error;
  }

  if (referrer) {
    await run(
      db,
      `INSERT INTO referrals (id, referrer_id, referee_id, status, created_at, is_simulated)
       VALUES (?, ?, ?, 'pending', ?, 0)`,
      newId("ref"),
      referrer.id,
      userId,
      createdAt,
    );
  }

  await recordEvent(db, {
    type: "registered",
    userId,
    refCode: referrer?.ref_code ?? null,
    props: {
      seatNo: inserted.seatNo,
      referred: Boolean(referrer),
      shareVariant: referrer ? body.shareVariant ?? null : null,
    },
    utmSource: body.utmSource ?? null,
    utmMedium: body.utmMedium ?? null,
    utmCampaign: body.utmCampaign ?? null,
  });

  // Keep the 60 s leaderboard cache honest right after a write.
  await Promise.all([
    c.env.CACHE.delete("leaderboard:students"),
    c.env.CACHE.delete("leaderboard:colleges"),
  ]);

  const user = { seat_no: inserted.seatNo, ref_code: inserted.refCode, name: body.name };
  return json(registerResponse(user, inserted.token, false, c.env, c.req.raw), {
    headers: { "set-cookie": tokenSetCookie(inserted.token) },
  });
});

app.get("/me", async (c) => {
  const user = await getUserFromRequest(c.req.raw, c.env);
  if (!user) return apiError(ERROR_CODES.UNAUTHORIZED);
  const db = c.env.DB;

  const [college, { total, qualified }, referralRows, studentRankRow, collegeRankRow, checkedInRow] =
    await Promise.all([
      user.college_id
        ? first<CollegeRow>(db, "SELECT * FROM colleges WHERE id = ?", user.college_id)
        : Promise.resolve(null),
      referralCounts(db, user.id),
      all<{ name: string; status: string; created_at: string }>(
        db,
        `SELECT u.name AS name, r.status AS status, r.created_at AS created_at
         FROM referrals r JOIN users u ON u.id = r.referee_id
         WHERE r.referrer_id = ? AND r.is_simulated = 0
         ORDER BY r.created_at DESC LIMIT 100`,
        user.id,
      ),
      first<{ rank: number }>(
        db,
        `WITH stats AS (
           SELECT u.id AS id,
             (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.status = 'qualified' AND r.is_simulated = 0) AS qualified,
             (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.is_simulated = 0) AS total
           FROM users u WHERE u.is_simulated = 0
         ), ranked AS (
           SELECT id, ROW_NUMBER() OVER (ORDER BY qualified DESC, total DESC, id ASC) AS rank
           FROM stats WHERE qualified > 0 OR total > 0
         )
         SELECT rank FROM ranked WHERE id = ?`,
        user.id,
      ),
      user.college_id
        ? first<{ rank: number; name: string }>(
            db,
            `WITH stats AS (
               SELECT c.id AS id, c.name AS name,
                 (SELECT COUNT(*) FROM users u WHERE u.college_id = c.id AND u.is_simulated = 0) AS regs,
                 (SELECT COUNT(*) FROM referrals r JOIN users ru ON ru.id = r.referrer_id
                  WHERE ru.college_id = c.id AND r.status = 'qualified' AND r.is_simulated = 0 AND ru.is_simulated = 0) AS qualified
               FROM colleges c
               WHERE EXISTS (SELECT 1 FROM users u WHERE u.college_id = c.id AND u.is_simulated = 0)
             ), ranked AS (
               SELECT id, name, ROW_NUMBER() OVER (ORDER BY regs DESC, qualified DESC, name ASC) AS rank FROM stats
             )
             SELECT rank, name FROM ranked WHERE id = ?`,
            user.college_id,
          )
        : Promise.resolve(null),
      first<{ x: number }>(
        db,
        "SELECT 1 AS x FROM checkins WHERE user_id = ? AND workshop_id = ? LIMIT 1",
        user.id,
        c.env.WORKSHOP_ID,
      ),
    ]);

  const pending = await count(
    db,
    "SELECT COUNT(*) AS n FROM referrals WHERE referrer_id = ? AND status = 'pending' AND is_simulated = 0",
    user.id,
  );

  let tierIndex = 0;
  let nextTierAt: number | null = null;
  let nextTierLabel: string | null = null;
  for (const tier of REWARD_TIERS) {
    const basis = tier.on === "qualified" ? qualified : total;
    if (basis >= tier.minReferrals) tierIndex++;
    else if (nextTierAt === null) {
      nextTierAt = tier.minReferrals;
      nextTierLabel = tier.label;
    }
  }

  const payload: MeResponse = {
    user: {
      id: user.id,
      name: user.name,
      firstName: firstName(user.name),
      college: college
        ? { id: college.id, name: college.name, shortName: college.short_name }
        : null,
      collegeOther: user.college_other,
      branch: user.branch,
      gradYear: user.grad_year,
      seatNo: user.seat_no,
      refCode: user.ref_code,
      createdAt: user.created_at,
      isSimulated: toBool(user.is_simulated),
    },
    idea: resolveIdeaCard(user.idea_key),
    referralLink: `${baseUrl(c.env, c.req.raw)}/r/${user.ref_code}`,
    referralLandingPath: `/r/${user.ref_code}`,
    stats: {
      totalReferrals: total,
      qualifiedReferrals: qualified,
      pendingReferrals: pending,
      tierIndex,
      nextTierAt,
      nextTierLabel,
    },
    ranks: {
      student: studentRankRow?.rank ?? null,
      college: collegeRankRow ? { rank: collegeRankRow.rank, name: collegeRankRow.name } : null,
    },
    referrals: referralRows.map((row) => ({
      firstName: firstName(row.name),
      status: row.status as "pending" | "qualified" | "rejected",
      createdAt: row.created_at,
    })),
    workshop: { id: c.env.WORKSHOP_ID, startIso: c.env.WORKSHOP_START_ISO },
    calendar: {
      icsPath: ICS_PATH,
      googleUrl: googleCalendarUrl(c.env),
    },
    checkedIn: Boolean(checkedInRow),
  };
  return json(payload);
});

app.get("/me/calendar.ics", (c) => {
  const start = new Date(c.env.WORKSHOP_START_ISO);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ship60//NxtWave//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${c.env.WORKSHOP_ID}@ship60`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    "SUMMARY:Build Your First AI Project in 60 Minutes — NxtWave",
    "DESCRIPTION:Free live workshop by NxtWave. Build and deploy your first AI project in 60 minutes.",
    "LOCATION:Online",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n") + "\r\n", {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="ship60-workshop.ics"',
      "cache-control": "public, max-age=3600",
    },
  });
});

app.get("/stats/public", async (c) => {
  const payload = await cachedJson<StatsPublicResponse>(
    c.env.CACHE,
    "stats:public",
    STATS_CACHE_SECONDS,
    async () => {
      const [registrations, colleges] = await Promise.all([
        count(c.env.DB, "SELECT COUNT(*) AS n FROM users WHERE is_simulated = 0"),
        count(
          c.env.DB,
          "SELECT COUNT(DISTINCT college_id) AS n FROM users WHERE is_simulated = 0 AND college_id IS NOT NULL",
        ),
      ]);
      return {
        registrations,
        colleges,
        workshopStartIso: c.env.WORKSHOP_START_ISO,
        target: Number(c.env.TARGET_REGISTRATIONS ?? TARGET_REGISTRATIONS),
      };
    },
  );
  return json(payload);
});

interface StudentRow {
  user_id: string;
  name: string;
  college_short: string;
  qualified: number;
  total: number;
  is_simulated: number;
}

interface CollegeStatsRow {
  college_id: string;
  name: string;
  short_name: string;
  registrations: number;
  qualified: number;
  ambassadors: number;
  simulated_count: number;
}

async function studentLeaderboard(db: D1Database): Promise<StudentLeaderboardRow[]> {
  const rows = await all<StudentRow>(
    db,
    `SELECT u.id AS user_id, u.name AS name, u.is_simulated AS is_simulated,
       COALESCE(c.short_name, u.college_other, 'Other') AS college_short,
       (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.status = 'qualified') AS qualified,
       (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id) AS total
     FROM users u
     LEFT JOIN colleges c ON c.id = u.college_id
     WHERE EXISTS (SELECT 1 FROM referrals r WHERE r.referrer_id = u.id)
     ORDER BY qualified DESC, total DESC, u.created_at ASC
     LIMIT 50`,
  );
  return rows.map((row, index) => ({
    rank: index + 1,
    displayName: publicName(row.name),
    collegeShort: row.college_short,
    qualified: row.qualified,
    total: row.total,
    isSimulated: toBool(row.is_simulated),
  }));
}

async function collegeLeaderboard(db: D1Database): Promise<CollegeLeaderboardRow[]> {
  const rows = await all<CollegeStatsRow>(
    db,
    `SELECT c.id AS college_id, c.name AS name, c.short_name AS short_name,
       COUNT(DISTINCT u.id) AS registrations,
       (SELECT COUNT(*) FROM referrals r JOIN users ru ON ru.id = r.referrer_id
        WHERE ru.college_id = c.id AND r.status = 'qualified') AS qualified,
       (SELECT COUNT(*) FROM users a WHERE a.college_id = c.id AND a.role = 'ambassador') AS ambassadors,
       SUM(CASE WHEN u.is_simulated = 1 THEN 1 ELSE 0 END) AS simulated_count
     FROM colleges c
     JOIN users u ON u.college_id = c.id
     GROUP BY c.id
     ORDER BY registrations DESC, qualified DESC, c.name ASC
     LIMIT 50`,
  );
  return rows.map((row, index) => ({
    rank: index + 1,
    collegeId: row.college_id,
    name: row.name,
    shortName: row.short_name,
    registrations: row.registrations,
    qualified: row.qualified,
    ambassadors: row.ambassadors,
    isSimulated: row.simulated_count > 0,
  }));
}

app.get("/leaderboard", async (c) => {
  const requested = c.req.query("type");
  if (requested && requested !== "students" && requested !== "colleges") {
    return apiError(ERROR_CODES.INVALID_INPUT, "type must be students or colleges");
  }
  const type = requested === "colleges" ? "colleges" : "students";
  const payload = await cachedJson<LeaderboardResponse>(
    c.env.CACHE,
    `leaderboard:${type}`,
    LEADERBOARD_CACHE_SECONDS,
    async () => {
      const workshopStartIso = c.env.WORKSHOP_START_ISO;
      if (type === "colleges") {
        return { type, colleges: await collegeLeaderboard(c.env.DB), workshopStartIso };
      }
      return { type, students: await studentLeaderboard(c.env.DB), workshopStartIso };
    },
  );
  return json(payload);
});

app.post("/events", async (c) => {
  const parsed = await parseJsonBody(c.req.raw, EventRequestSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const ipHash = await hashIp(clientIp(c.req.raw), ipHashSalt(c.env));
  const limited = await rateLimit(
    c.env.CACHE,
    `events:${ipHash}`,
    RATE_LIMITS.events.limit,
    RATE_LIMITS.events.windowSeconds,
  );
  if (!limited.ok) return apiError(ERROR_CODES.RATE_LIMITED);

  const user = await getUserFromRequest(c.req.raw, c.env);
  await recordEvent(c.env.DB, {
    type: body.type,
    anonId: body.anonId ?? null,
    userId: user?.id ?? null,
    props: body.props ?? null,
    utmSource: body.utmSource ?? null,
    utmMedium: body.utmMedium ?? null,
    utmCampaign: body.utmCampaign ?? null,
  });
  return json({ ok: true });
});

app.get("/colleges", async (c) => {
  const q = (c.req.query("q") ?? "").trim().slice(0, 60);
  const like = `%${q}%`;
  const rows = await all<CollegeRow>(
    c.env.DB,
    `SELECT id, name, short_name, city FROM colleges
     WHERE name LIKE ? OR short_name LIKE ?
     ORDER BY name ASC LIMIT 10`,
    like,
    like,
  );
  const options: CollegeOption[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    city: row.city ?? null,
  }));
  return json(options);
});

app.get("/ambassador/:code", async (c) => {
  const code = c.req.param("code").trim().toUpperCase();
  const db = c.env.DB;
  const user = await first<UserRow>(
    db,
    "SELECT * FROM users WHERE UPPER(ref_code) = ? LIMIT 1",
    code,
  );
  if (!user) return apiError(ERROR_CODES.NOT_FOUND, "No kit found for this code.");

  // Simulated ambassadors are demo data: their kit shows the seeded campaign
  // numbers (with a visible "Simulated data" label), while real ambassadors
  // keep the real-only filters so fake rows never inflate a real person.
  const sim = toBool(user.is_simulated);
  const refSim = sim ? "" : " AND r.is_simulated = 0";
  const userSim = sim ? "" : " AND u.is_simulated = 0";
  const ruSim = sim ? "" : " AND ru.is_simulated = 0";

  const [{ total, qualified }, college, ambassadorsRank, collegeRank] = await Promise.all([
    first<{ total: number; qualified: number }>(
      db,
      `SELECT
         (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = ?${refSim}) AS total,
         (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = ? AND r.status = 'qualified'${refSim}) AS qualified`,
      user.id,
      user.id,
    ).then((row) => row ?? { total: 0, qualified: 0 }),
    user.college_id
      ? first<CollegeRow>(db, "SELECT * FROM colleges WHERE id = ?", user.college_id)
      : Promise.resolve(null),
    user.role === "ambassador"
      ? first<{ rank: number }>(
          db,
          `WITH stats AS (
             SELECT u.id AS id,
               (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id AND r.status = 'qualified'${refSim}) AS qualified,
               (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id${refSim}) AS total
             FROM users u WHERE u.role = 'ambassador'${userSim}
           ), ranked AS (
             SELECT id, ROW_NUMBER() OVER (ORDER BY qualified DESC, total DESC, id ASC) AS rank FROM stats
           )
           SELECT rank FROM ranked WHERE id = ?`,
          user.id,
        )
      : Promise.resolve(null),
    user.college_id
      ? first<{ rank: number }>(
          db,
          `WITH stats AS (
             SELECT c.id AS id,
               (SELECT COUNT(*) FROM users u WHERE u.college_id = c.id${userSim}) AS regs,
               (SELECT COUNT(*) FROM referrals r JOIN users ru ON ru.id = r.referrer_id
                WHERE ru.college_id = c.id AND r.status = 'qualified'${refSim}${ruSim}) AS qualified
             FROM colleges c
             WHERE EXISTS (SELECT 1 FROM users u WHERE u.college_id = c.id${userSim})
           ), ranked AS (
             SELECT id, ROW_NUMBER() OVER (ORDER BY regs DESC, qualified DESC, id ASC) AS rank FROM stats
           )
           SELECT rank FROM ranked WHERE id = ?`,
          user.college_id,
        )
      : Promise.resolve(null),
  ]);

  const payload = AmbassadorKitResponseSchema.parse({
    code: user.ref_code,
    name: publicName(user.name),
    college: college?.short_name ?? user.college_other ?? null,
    referralLink: `${baseUrl(c.env, c.req.raw)}/r/${user.ref_code}`,
    stats: {
      registrations: total,
      qualified,
      ambassadorRank: ambassadorsRank?.rank ?? null,
      collegeRank: collegeRank?.rank ?? null,
    },
    postingWindow: "8–10 PM",
    checklist: [
      "Ask the group admin before posting.",
      "Post once per wave — 8–10 PM is the best window.",
      "Share your link, not a screenshot, so every join is tracked.",
      "Answer questions in the thread instead of reposting.",
      "Never add people to a group without asking them.",
    ],
    isSimulated: sim,
  });
  return json(payload);
});

export default app;
