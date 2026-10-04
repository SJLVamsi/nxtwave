/**
 * WS1 — public API + referral landing integration tests (Workers pool, real D1/KV).
 * Covers the brief: happy path, duplicates, self-referral, rate limit, IP velocity,
 * disposable flags, referral attribution + qualification, /r/:code HTML + cookie,
 * leaderboard shape + KV cache, and the remaining public endpoints.
 */
import { SELF, env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  AmbassadorKitResponseSchema,
  CollegeOptionSchema,
  LeaderboardResponseSchema,
  MeResponseSchema,
  RegisterResponseSchema,
  StatsPublicResponseSchema,
} from "../../src/shared/contracts";
import { qualifyReferral } from "../../src/worker/lib/referral";
import { hashIp, ipHashSalt } from "../../src/worker/lib/auth";

const base = "https://ship60.test";
const registerUrl = `${base}/api/register`;

// The Cloudflare vitest plugin shares D1/KV storage across tests in one file, so
// each test starts from a clean slate (children before parents for FKs).
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM checkins"),
    env.DB.prepare("DELETE FROM referrals"),
    env.DB.prepare("DELETE FROM events"),
    env.DB.prepare("DELETE FROM submissions"),
    env.DB.prepare("DELETE FROM users"),
    env.DB.prepare("DELETE FROM colleges"),
  ]);
  const listed = await env.CACHE.list();
  await Promise.all(listed.keys.map((key) => env.CACHE.delete(key.name)));
});

type Body = Record<string, unknown>;

function registrationBody(overrides: Body = {}): Body {
  return {
    name: "Rahul Kumar",
    email: "rahul@example.com",
    phone: "9876543210",
    branch: "CSE/IT/AI-ML",
    gradYear: 2027,
    consent: true,
    ...overrides,
  };
}

let ipCounter = 0;
function freshIp(): string {
  ipCounter += 1;
  return `198.51.100.${(ipCounter % 200) + 10}`;
}

interface RegisterOptions {
  ip?: string;
  headers?: Record<string, string>;
  cookie?: string;
}

async function register(overrides: Body = {}, options: RegisterOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "cf-connecting-ip": options.ip ?? freshIp(),
    ...options.headers,
  };
  if (options.cookie) headers.cookie = options.cookie;
  return SELF.fetch(registerUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(registrationBody(overrides)),
  });
}

async function registerJson(overrides: Body = {}, options: RegisterOptions = {}) {
  const res = await register(overrides, options);
  expect(res.status).toBe(200);
  return RegisterResponseSchema.parse(await res.json());
}

async function userByEmail(email: string): Promise<Record<string, unknown> | null> {
  return env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first<Record<string, unknown>>();
}

async function scalar(sql: string, ...params: (string | number | null)[]): Promise<number> {
  const row = await env.DB.prepare(sql)
    .bind(...params)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

async function insertCollege(id: string, name: string, shortName: string, city: string) {
  await env.DB.prepare(
    "INSERT INTO colleges (id, name, short_name, city) VALUES (?, ?, ?, ?)",
  )
    .bind(id, name, shortName, city)
    .run();
}

describe("POST /api/register", () => {
  it("happy path: seat 1, readable ref code, token cookie and a registered event", async () => {
    const res = await register();
    expect(res.status).toBe(200);

    const payload = RegisterResponseSchema.parse(await res.json());
    expect(payload.seatNo).toBe(1);
    expect(payload.refCode).toMatch(/^[A-Z0-9]{5,11}$/);
    expect(payload.refCode.startsWith("RAHUL")).toBe(true);
    expect(payload.isReturning).toBe(false);
    expect(payload.launchpadUrl).toContain("/me?t=");

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("s60_token=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Max-Age=5184000");

    const user = await userByEmail("rahul@example.com");
    expect(user?.seat_no).toBe(1);
    expect(user?.email).toBe("rahul@example.com");
    expect(user?.phone).toBe("+919876543210");
    expect(user?.is_simulated).toBe(0);

    expect(await scalar("SELECT COUNT(*) AS n FROM events WHERE type = 'registered'")).toBe(1);
    const event = await env.DB.prepare("SELECT * FROM events WHERE type = 'registered'").first<
      Record<string, unknown>
    >();
    expect(JSON.parse(String(event?.props))).toMatchObject({ seatNo: 1, referred: false });
  });

  it("normalises email casing and phone formats before de-duplication", async () => {
    await registerJson({ email: "Rahul@Example.COM", phone: "+91 98765-43210" });
    const user = await userByEmail("rahul@example.com");
    expect(user?.phone).toBe("+919876543210");
  });

  it("duplicate email without proof returns 409 DUPLICATE and mints nothing", async () => {
    const first = await registerJson();
    const res = await register({ phone: "9876500001" }, { ip: freshIp() });

    expect(res.status).toBe(409);
    expect(res.headers.get("set-cookie")).toBeNull();
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.error as { code?: string } | undefined)?.code).toBe("DUPLICATE");
    expect(body.token).toBeUndefined();
    expect(body.launchpadUrl).toBeUndefined();

    // The victim's original token still works after the failed takeover.
    const me = await SELF.fetch(`${base}/api/me?t=${encodeURIComponent(first.token)}`);
    expect(me.status).toBe(200);
  });

  it("duplicate email with the existing token rotates and returns isReturning", async () => {
    const first = await registerJson();
    const res = await register(
      { phone: "9876500001" },
      { ip: freshIp(), headers: { authorization: `Bearer ${first.token}` } },
    );

    expect(res.status).toBe(200);
    const second = RegisterResponseSchema.parse(await res.json());
    expect(second.isReturning).toBe(true);
    expect(second.seatNo).toBe(first.seatNo);
    expect(second.refCode).toBe(first.refCode);
    expect(second.token).not.toBe(first.token);
    expect(res.headers.get("set-cookie")).toContain("s60_token=");

    const rotated = await SELF.fetch(`${base}/api/me?t=${encodeURIComponent(second.token)}`);
    expect(rotated.status).toBe(200);
    const stale = await SELF.fetch(`${base}/api/me?t=${encodeURIComponent(first.token)}`);
    expect(stale.status).toBe(401);
  });

  it("duplicate email with the existing cookie rotates the token too", async () => {
    const first = await registerJson();
    const res = await register(
      { phone: "9876500001" },
      { ip: freshIp(), cookie: `s60_token=${encodeURIComponent(first.token)}` },
    );
    expect(res.status).toBe(200);
    const second = RegisterResponseSchema.parse(await res.json());
    expect(second.isReturning).toBe(true);
    expect(second.token).not.toBe(first.token);
  });

  it("rate limits duplicate attempts per identifier after 10 per hour", async () => {
    await registerJson();
    for (let i = 0; i < 10; i++) {
      const res = await register({ phone: "9876500001" }, { ip: freshIp() });
      expect(res.status).toBe(409);
    }
    const res = await register({ phone: "9876500001" }, { ip: freshIp() });
    expect(res.status).toBe(429);
    const err = await res.json<{ error: { code: string } }>();
    expect(err.error.code).toBe("RATE_LIMITED");
  });

  it("duplicate phone returns the existing seat when the same user proves ownership", async () => {
    const first = await registerJson();
    const second = await registerJson(
      { email: "other@example.com" },
      { ip: freshIp(), headers: { authorization: `Bearer ${first.token}` } },
    );

    expect(second.isReturning).toBe(true);
    expect(second.seatNo).toBe(first.seatNo);
    expect(await scalar("SELECT COUNT(*) AS n FROM users")).toBe(1);
  });

  it("ignores self-referral: no referrals row for an existing user's own code", async () => {
    const first = await registerJson();
    const res = await register(
      { refCode: first.refCode },
      { headers: { authorization: `Bearer ${first.token}` } },
    );
    expect(res.status).toBe(200);
    const payload = RegisterResponseSchema.parse(await res.json());
    expect(payload.isReturning).toBe(true);
    expect(await scalar("SELECT COUNT(*) AS n FROM referrals")).toBe(0);
  });

  it("rate limits the sixth registration from one IP", async () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i++) {
      const res = await register(
        { email: `user${i}@example.com`, phone: `98765432${String(10 + i)}` },
        { ip },
      );
      expect(res.status).toBe(200);
    }
    const res = await register({ email: "sixth@example.com", phone: "9876543299" }, { ip });
    expect(res.status).toBe(429);
    const err = await res.json<{ error: { code: string } }>();
    expect(err.error.code).toBe("RATE_LIMITED");
  });

  it("flags ip_velocity when the registration is the sixth from an IP hash in an hour", async () => {
    const ip = "203.0.113.9";
    const ipHash = await hashIp(ip, ipHashSalt(env));
    const at = new Date().toISOString();
    for (let i = 0; i < 5; i++) {
      await env.DB.prepare(
        `INSERT INTO users (id, name, email, phone, branch, grad_year, ref_code, token_hash, seat_no, ip_hash, consent_at, created_at)
         VALUES (?, ?, ?, ?, 'ECE', 2027, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          `seed_${i}`,
          `Seed ${i}`,
          `seed${i}@example.com`,
          `90000000${String(10 + i)}`,
          `SEED${i}`,
          `seedhash_${i}`,
          i + 1,
          ipHash,
          at,
          at,
        )
        .run();
    }

    const res = await register({ email: "sixth@example.com", phone: "9876543210" }, { ip });
    expect(res.status).toBe(200);
    const user = await userByEmail("sixth@example.com");
    expect(user?.flag_reason).toBe("ip_velocity");
    expect(user?.flag_status).toBe("open");
  });

  it("flags disposable email domains but still registers the user", async () => {
    const res = await register({ email: "throwaway@mailinator.com" });
    expect(res.status).toBe(200);
    const user = await userByEmail("throwaway@mailinator.com");
    expect(user).not.toBeNull();
    expect(user?.flag_reason).toBe("disposable_email");
    expect(user?.flag_status).toBe("open");
  });

  it("attributes body refCode as a pending referral and qualifyReferral flips it", async () => {
    const a = await registerJson({ email: "a@example.com", phone: "9876543210" });
    await registerJson({
      email: "b@example.com",
      phone: "9876543211",
      refCode: a.refCode,
      shareVariant: "te",
    });

    const aUser = await userByEmail("a@example.com");
    const bUser = await userByEmail("b@example.com");
    expect(bUser?.referred_by).toBe(aUser?.id);
    expect(bUser?.share_variant).toBe("te");

    const referral = await env.DB.prepare("SELECT * FROM referrals WHERE referee_id = ?")
      .bind(bUser?.id)
      .first<Record<string, unknown>>();
    expect(referral?.status).toBe("pending");
    expect(referral?.referrer_id).toBe(aUser?.id);
    expect(referral?.is_simulated).toBe(0);

    const qualified = await qualifyReferral(env.DB, String(bUser?.id));
    expect(qualified).toEqual({ qualified: true, referrerId: aUser?.id });
    const after = await env.DB.prepare("SELECT status FROM referrals WHERE id = ?")
      .bind(referral?.id)
      .first<{ status: string }>();
    expect(after?.status).toBe("qualified");

    const registeredEvent = await env.DB.prepare(
      "SELECT * FROM events WHERE type = 'registered' AND user_id = ?",
    )
      .bind(bUser?.id)
      .first<Record<string, unknown>>();
    expect(registeredEvent?.ref_code).toBe(a.refCode);
  });

  it("rejects invalid input with INVALID_INPUT", async () => {
    const res = await register({ phone: "12345" });
    expect(res.status).toBe(400);
    const err = await res.json<{ error: { code: string } }>();
    expect(err.error.code).toBe("INVALID_INPUT");
  });
});

describe("GET /r/:code", () => {
  it("serves OG HTML, sets the s60_ref cookie and records a landing event", async () => {
    const a = await registerJson();
    const res = await SELF.fetch(`${base}/r/${a.refCode}`);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<title>");
    expect(html).toContain("og:image");
    expect(html).toContain(`/og/${a.refCode}.png`);
    expect(html).toContain("og:url");
    expect(html).toContain("twitter:card");
    expect(html).toContain("summary_large_image");
    expect(html).toContain(`/?ref=${a.refCode}`);

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("s60_ref=");
    expect(setCookie).toContain("Max-Age=2592000");

    const landing = await env.DB.prepare("SELECT * FROM events WHERE type = 'referral_landing'").first<
      Record<string, unknown>
    >();
    expect(landing?.ref_code).toBe(a.refCode);
  });

  it("captures the message variant in the event and the redirect", async () => {
    const a = await registerJson();
    const res = await SELF.fetch(`${base}/r/${a.refCode}?v=te`);
    const html = await res.text();
    expect(html).toContain("&v=te");
    const landing = await env.DB.prepare("SELECT * FROM events WHERE type = 'referral_landing'").first<
      Record<string, unknown>
    >();
    expect(JSON.parse(String(landing?.props))).toMatchObject({ v: "te" });
  });

  it("first touch wins: an existing s60_ref cookie is not overwritten", async () => {
    const a = await registerJson({ email: "a@example.com" });
    const b = await registerJson({ email: "b@example.com", phone: "9876543211" });

    const first = await SELF.fetch(`${base}/r/${a.refCode}`);
    const cookie = (first.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
    expect(cookie).toContain("s60_ref=");

    const second = await SELF.fetch(`${base}/r/${b.refCode}`, { headers: { cookie } });
    expect(second.headers.get("set-cookie")).toBeNull();
    const html = await second.text();
    expect(html).toContain(`/?ref=${a.refCode}`);
  });

  it("redirects unknown codes to / without a cookie", async () => {
    const res = await SELF.fetch(`${base}/r/NOPE123`, { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});

describe("GET /api/me", () => {
  it("returns the contract shape via ?t= and exposes no email or phone", async () => {
    const a = await registerJson({ ideaKey: "CSE/IT/AI-ML|placements|1" });
    const res = await SELF.fetch(`${base}/api/me?t=${encodeURIComponent(a.token)}`);
    expect(res.status).toBe(200);

    const raw = (await res.json()) as Record<string, unknown>;
    const me = MeResponseSchema.parse(raw);
    expect(me.user.seatNo).toBe(1);
    expect(me.user.firstName).toBe("Rahul");
    expect(me.user.isSimulated).toBe(false);
    expect(me.referralLink).toContain(`/r/${a.refCode}`);
    expect(me.referralLandingPath).toBe(`/r/${a.refCode}`);
    expect(me.calendar.icsPath).toBe("/api/me/calendar.ics");
    expect(me.workshop.startIso).toBe(env.WORKSHOP_START_ISO);
    expect(me.checkedIn).toBe(false);
    expect(me.idea?.title).toBe("Placement Prep Buddy");
    expect(me.idea?.variant).toBe(1);
    expect(me.idea?.source).toBe("bank");
    expect(JSON.stringify(raw)).not.toContain("rahul@example.com");
    expect(JSON.stringify(raw)).not.toContain("9876543210");
  });

  it("resolves the real WS2 idea key idea:{branch}:{interest}:{variant}", async () => {
    const a = await registerJson({ ideaKey: "idea:CSE/IT/AI-ML:placements:0" });
    const res = await SELF.fetch(`${base}/api/me?t=${encodeURIComponent(a.token)}`);
    expect(res.status).toBe(200);
    const me = MeResponseSchema.parse(await res.json());
    expect(me.idea).not.toBeNull();
    expect(me.idea?.title).toBe("Placement Prep Buddy");
    expect(me.idea?.branch).toBe("CSE/IT/AI-ML");
    expect(me.idea?.interest).toBe("placements");
    expect(me.idea?.variant).toBe(0);
    expect(me.idea?.source).toBe("bank");
  });

  it("accepts an Authorization: Bearer token", async () => {
    const a = await registerJson();
    const res = await SELF.fetch(`${base}/api/me`, {
      headers: { authorization: `Bearer ${a.token}` },
    });
    expect(res.status).toBe(200);
    expect(MeResponseSchema.safeParse(await res.json()).success).toBe(true);
  });

  it("computes referral stats, tier progress, ranks and the referral list", async () => {
    await insertCollege("c_kmit", "Keshav Memorial Institute of Technology", "KMIT", "Hyderabad");
    const a = await registerJson({
      email: "a@example.com",
      collegeId: "c_kmit",
      phone: "9876543210",
    });
    await registerJson({
      name: "Bhavya Rao",
      email: "b@example.com",
      phone: "9876543211",
      refCode: a.refCode,
      collegeId: "c_kmit",
    });
    await registerJson({
      name: "Charan Das",
      email: "c@example.com",
      phone: "9876543212",
      refCode: a.refCode,
      collegeId: "c_kmit",
    });
    const bUser = await userByEmail("b@example.com");
    await qualifyReferral(env.DB, String(bUser?.id));

    const res = await SELF.fetch(`${base}/api/me?t=${encodeURIComponent(a.token)}`);
    const me = MeResponseSchema.parse(await res.json());
    expect(me.stats.totalReferrals).toBe(2);
    expect(me.stats.qualifiedReferrals).toBe(1);
    expect(me.stats.pendingReferrals).toBe(1);
    expect(me.stats.tierIndex).toBe(1);
    expect(me.stats.nextTierAt).toBe(3);
    expect(me.stats.nextTierLabel).toBe("Priority Q&A in the live session");
    expect(me.ranks.student).toBe(1);
    expect(me.ranks.college?.rank).toBe(1);
    expect(me.ranks.college?.name).toBe("Keshav Memorial Institute of Technology");
    expect(me.referrals.map((r) => r.firstName).sort()).toEqual(["Bhavya", "Charan"]);
    expect(me.referrals.map((r) => r.status).sort()).toEqual(["pending", "qualified"]);
  });

  it("reports checkedIn once the checkins row exists", async () => {
    const a = await registerJson();
    const user = await userByEmail("rahul@example.com");
    await env.DB.prepare(
      "INSERT INTO checkins (user_id, workshop_id, checked_in_at, is_simulated) VALUES (?, ?, ?, 0)",
    )
      .bind(user?.id, env.WORKSHOP_ID, new Date().toISOString())
      .run();
    const res = await SELF.fetch(`${base}/api/me?t=${encodeURIComponent(a.token)}`);
    const me = MeResponseSchema.parse(await res.json());
    expect(me.checkedIn).toBe(true);
  });

  it("returns UNAUTHORIZED without a token", async () => {
    const res = await SELF.fetch(`${base}/api/me`);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/me/calendar.ics", () => {
  it("serves a real 60-minute VEVENT at the workshop start", async () => {
    const res = await SELF.fetch(`${base}/api/me/calendar.ics`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const ics = await res.text();
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20261011T133000Z");
    expect(ics).toContain("DTEND:20261011T143000Z");
    expect(ics).toContain("SUMMARY:Build Your First AI Project in 60 Minutes — NxtWave");
  });
});

describe("GET /api/stats/public", () => {
  it("counts only real rows and caches the payload in KV", async () => {
    const at = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO users (id, name, email, phone, branch, grad_year, ref_code, token_hash, seat_no, consent_at, created_at, is_simulated)
       VALUES ('sim_1', 'Fake Student', 'fake@example.com', '9000000000', 'ECE', 2027, 'FAKE123', 'simhash', 900, ?, ?, 1)`,
    )
      .bind(at, at)
      .run();
    await registerJson();

    const res = await SELF.fetch(`${base}/api/stats/public`);
    expect(res.status).toBe(200);
    const stats = StatsPublicResponseSchema.parse(await res.json());
    expect(stats.registrations).toBe(1);
    expect(stats.colleges).toBe(0);
    expect(stats.workshopStartIso).toBe(env.WORKSHOP_START_ISO);
    expect(stats.target).toBe(500);

    const cached = await env.CACHE.get("stats:public");
    expect(cached).not.toBeNull();
  });
});

describe("GET /api/leaderboard", () => {
  it("ranks students by qualified then total and never exposes email or phone", async () => {
    const a = await registerJson({ email: "a@example.com", phone: "9876543210" });
    const b = await registerJson({
      email: "b@example.com",
      phone: "9876543211",
      refCode: a.refCode,
    });
    const bUser = await userByEmail("b@example.com");
    await qualifyReferral(env.DB, String(bUser?.id));

    const res = await SELF.fetch(`${base}/api/leaderboard?type=students`);
    expect(res.status).toBe(200);
    const data = LeaderboardResponseSchema.parse(await res.json());
    expect(data.type).toBe("students");
    expect(data.students?.length).toBe(1);
    expect(data.students?.[0]).toMatchObject({
      rank: 1,
      displayName: "Rahul K.",
      qualified: 1,
      total: 1,
    });
    expect(JSON.stringify(data)).not.toContain("@example.com");
    expect(JSON.stringify(data)).not.toContain("9876543211");
    expect(b.refCode).toBeTruthy();
  });

  it("serves colleges with registrations, qualified and ambassador counts", async () => {
    await insertCollege("c_vnr", "VNR Vignana Jyothi Institute of Engineering and Technology", "VNR", "Hyderabad");
    await registerJson({ collegeId: "c_vnr" });
    await registerJson({ email: "b@example.com", phone: "9876543211", collegeId: "c_vnr" });

    const res = await SELF.fetch(`${base}/api/leaderboard?type=colleges`);
    const data = LeaderboardResponseSchema.parse(await res.json());
    expect(data.type).toBe("colleges");
    expect(data.colleges?.[0]).toMatchObject({
      rank: 1,
      collegeId: "c_vnr",
      shortName: "VNR",
      registrations: 2,
      qualified: 0,
      ambassadors: 0,
    });
  });

  it("serves the KV cache for 60 s and refreshes after the key is deleted", async () => {
    const a = await registerJson({ email: "a@example.com", phone: "9876543210" });
    await registerJson({ email: "b@example.com", phone: "9876543211", refCode: a.refCode });
    const bUser = await userByEmail("b@example.com");

    const first = LeaderboardResponseSchema.parse(
      await (await SELF.fetch(`${base}/api/leaderboard?type=students`)).json(),
    );
    expect(first.students?.[0]?.qualified).toBe(0);

    await qualifyReferral(env.DB, String(bUser?.id));
    expect(await env.CACHE.get("leaderboard:students")).not.toBeNull();

    const cached = LeaderboardResponseSchema.parse(
      await (await SELF.fetch(`${base}/api/leaderboard?type=students`)).json(),
    );
    expect(cached.students?.[0]?.qualified).toBe(0);

    await env.CACHE.delete("leaderboard:students");
    const fresh = LeaderboardResponseSchema.parse(
      await (await SELF.fetch(`${base}/api/leaderboard?type=students`)).json(),
    );
    expect(fresh.students?.[0]?.qualified).toBe(1);
  });

  it("rejects an unknown type", async () => {
    const res = await SELF.fetch(`${base}/api/leaderboard?type=aliens`);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/events", () => {
  it("inserts the event and returns ok", async () => {
    const res = await SELF.fetch(`${base}/api/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": freshIp() },
      body: JSON.stringify({
        type: "page_view",
        anonId: "a_test123",
        props: { path: "/" },
        utmSource: "whatsapp",
      }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const row = await env.DB.prepare("SELECT * FROM events WHERE type = 'page_view'").first<
      Record<string, unknown>
    >();
    expect(row?.anon_id).toBe("a_test123");
    expect(row?.utm_source).toBe("whatsapp");
  });

  it("rejects an undocumented event type", async () => {
    const res = await SELF.fetch(`${base}/api/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": freshIp() },
      body: JSON.stringify({ type: "hack_attempt" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/colleges", () => {
  it("matches case-insensitively and caps options at 10", async () => {
    await insertCollege("c_vnr", "VNR VJIET", "VNR", "Hyderabad");
    await insertCollege("c_cbit", "Chaitanya Bharathi Institute of Technology", "CBIT", "Hyderabad");

    const res = await SELF.fetch(`${base}/api/colleges?q=vnr`);
    expect(res.status).toBe(200);
    const options = z.array(CollegeOptionSchema).parse(await res.json());
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ id: "c_vnr", shortName: "VNR", city: "Hyderabad" });
  });
});

describe("GET /api/ambassador/:code", () => {
  it("returns the kit with public-only identity and zeroed stats", async () => {
    await insertCollege("c_kmit", "Keshav Memorial Institute of Technology", "KMIT", "Hyderabad");
    const a = await registerJson({ collegeId: "c_kmit" });

    const res = await SELF.fetch(`${base}/api/ambassador/${a.refCode}`);
    expect(res.status).toBe(200);
    const kit = AmbassadorKitResponseSchema.parse(await res.json());
    expect(kit.code).toBe(a.refCode);
    expect(kit.name).toBe("Rahul K.");
    expect(kit.college).toBe("KMIT");
    expect(kit.referralLink).toContain(`/r/${a.refCode}`);
    expect(kit.stats).toEqual({
      registrations: 0,
      qualified: 0,
      ambassadorRank: null,
      collegeRank: 1,
    });
    expect(kit.postingWindow).toBe("8–10 PM");
    expect(kit.checklist.length).toBeGreaterThan(0);
    expect(JSON.stringify(kit)).not.toContain("rahul@example.com");
  });

  it("404s for an unknown code", async () => {
    const res = await SELF.fetch(`${base}/api/ambassador/NOPE123`);
    expect(res.status).toBe(404);
  });
});
