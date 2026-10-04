import { env } from "cloudflare:test";
import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";
import type { LiveServerMessage } from "../../src/shared/contracts";
import { hashToken, signAdminSession } from "../../src/worker/lib/auth";
import { newId } from "../../src/worker/lib/ids";
import type { AppContext, AppEnv } from "../../src/worker/env";
import liveApp from "../../src/worker/routes/live";

const base = "https://ship60.test";
const workshopId = "ship60-2026-10-11";
const ctx = {} as ExecutionContext;
const bindings = env as AppEnv;
const testApp = new Hono<AppContext>().route("/api/live", liveApp);
let seq = 0;

function fetchLive(path: string, init?: RequestInit): Promise<Response> {
  return Promise.resolve(testApp.fetch(new Request(`${base}${path}`, init), bindings, ctx));
}

async function createUser(name: string, options: { referredBy?: string } = {}) {
  seq += 1;
  const id = newId("usertest");
  const token = `live-test-token-${id}-${seq}`;
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, phone, branch, grad_year, role, ref_code, referred_by, token_hash, seat_no, consent_at, is_simulated, created_at)
     VALUES (?, ?, ?, ?, ?, 2027, 'student', ?, ?, ?, ?, ?, 0, ?)`,
  )
    .bind(
      id,
      name,
      `live-${seq}-${id}@example.com`,
      `+9199${String(seq).padStart(8, "0")}`,
      "CSE/IT/AI-ML",
      `L${seq}${id.slice(0, 6).toUpperCase()}`,
      options.referredBy ?? null,
      await hashToken(token),
      5000 + seq,
      new Date().toISOString(),
      new Date().toISOString(),
    )
    .run();
  return { id, token, name };
}

async function adminCookie(): Promise<string> {
  const session = await signAdminSession(bindings.SESSION_SECRET!, Date.now());
  return `s60_admin=${encodeURIComponent(session)}`;
}

class WsClient {
  readonly log: { msg: LiveServerMessage; at: number }[] = [];
  private readonly ws: WebSocket;
  private waiters: {
    match: (msg: LiveServerMessage) => boolean;
    resolve: (msg: LiveServerMessage) => void;
    timer: ReturnType<typeof setTimeout>;
  }[] = [];

  constructor(ws: WebSocket) {
    this.ws = ws;
    ws.accept();
    ws.addEventListener("message", (event) => {
      let msg: LiveServerMessage;
      try {
        msg = JSON.parse(String(event.data)) as LiveServerMessage;
      } catch {
        return;
      }
      const at = Date.now();
      this.log.push({ msg, at });
      const index = this.waiters.findIndex((waiter) => waiter.match(msg));
      if (index >= 0) {
        const [waiter] = this.waiters.splice(index, 1);
        clearTimeout(waiter.timer);
        waiter.resolve(msg);
      }
    });
  }

  send(message: unknown): void {
    this.ws.send(JSON.stringify(message));
  }

  waitForWhere(
    match: (msg: LiveServerMessage) => boolean,
    label: string,
    timeoutMs = 5000,
  ): Promise<LiveServerMessage> {
    const existing = this.log.find((entry) => match(entry.msg));
    if (existing) {
      this.log.splice(this.log.indexOf(existing), 1);
      return Promise.resolve(existing.msg);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((waiter) => waiter.timer !== timer);
        reject(new Error(`Timed out waiting for ${label}`));
      }, timeoutMs);
      this.waiters.push({ match, resolve, timer });
    });
  }

  async waitFor<T extends LiveServerMessage["type"]>(
    type: T,
    timeoutMs = 5000,
  ): Promise<Extract<LiveServerMessage, { type: T }>> {
    return (await this.waitForWhere((msg) => msg.type === type, type, timeoutMs)) as Extract<
      LiveServerMessage,
      { type: T }
    >;
  }

  close(): void {
    try {
      this.ws.close();
    } catch {
      /* already closed */
    }
  }
}

const clients: WsClient[] = [];

async function openWs(query: string, cookie?: string): Promise<WsClient> {
  const res = await fetchLive(`/api/live/${workshopId}/ws${query}`, {
    headers: { Upgrade: "websocket", ...(cookie ? { Cookie: cookie } : {}) },
  });
  expect(res.status).toBe(101);
  if (!res.webSocket) throw new Error("Upgrade response had no webSocket");
  const client = new WsClient(res.webSocket);
  clients.push(client);
  return client;
}

afterEach(() => {
  while (clients.length > 0) clients.pop()?.close();
});

describe("live routes", () => {
  it("lists the current workshop without auth", async () => {
    const res = await fetchLive("/api/live/current");
    expect(res.status).toBe(200);
    const body = await res.json<{ workshopId: string }>();
    expect(body.workshopId).toBe(workshopId);
  });

  it("404s an unknown workshop id", async () => {
    const res = await fetchLive(`/api/live/not-this-workshop/state`);
    expect(res.status).toBe(404);
  });

  it("rejects a host upgrade with no admin session", async () => {
    const res = await fetchLive(`/api/live/${workshopId}/ws?role=host`, {
      headers: { Upgrade: "websocket" },
    });
    expect([401, 403]).toContain(res.status);
  });

  it("accepts a participant upgrade and sends state after join", async () => {
    const client = await openWs("");
    client.send({ type: "join" });
    const state = await client.waitFor("state");
    expect(state.role).toBe("participant");
    expect(state.step).toBeGreaterThanOrEqual(1);
    expect(state.step).toBeLessThanOrEqual(6);
    expect(state.checkedIn).toBe(false);
    expect(typeof state.attendance).toBe("number");
  });

  it("refuses a client-claimed host role", async () => {
    const client = await openWs("");
    client.send({ type: "join", role: "host" });
    const error = await client.waitFor("error");
    expect(error.code).toBe("FORBIDDEN");
  });
});

describe("live room", () => {
  it("check-in writes D1, qualifies a pending referral, and records the event", async () => {
    const referrer = await createUser("Referrer One");
    const referee = await createUser("Referee Two", { referredBy: referrer.id });
    await env.DB.prepare(
      "INSERT INTO referrals (id, referrer_id, referee_id, status, created_at, is_simulated) VALUES (?, ?, ?, 'pending', ?, 0)",
    )
      .bind(newId("ref"), referrer.id, referee.id, new Date().toISOString())
      .run();

    const client = await openWs(`?t=${encodeURIComponent(referee.token)}`);
    client.send({ type: "join", token: referee.token });
    client.send({ type: "checkin" });
    const state = await client.waitForWhere(
      (msg) => msg.type === "state" && msg.checkedIn,
      "checked-in state",
    );
    expect(state.type).toBe("state");

    const checkin = await env.DB.prepare(
      "SELECT workshop_id, is_simulated FROM checkins WHERE user_id = ?",
    )
      .bind(referee.id)
      .first<{ workshop_id: string; is_simulated: number }>();
    expect(checkin?.workshop_id).toBe(workshopId);
    expect(checkin?.is_simulated).toBe(0);

    const referral = await env.DB.prepare(
      "SELECT status, qualified_at FROM referrals WHERE referee_id = ?",
    )
      .bind(referee.id)
      .first<{ status: string; qualified_at: string | null }>();
    expect(referral?.status).toBe("qualified");
    expect(referral?.qualified_at).toBeTruthy();

    const events = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM events WHERE user_id = ? AND type = 'checkin' AND is_simulated = 0",
    )
      .bind(referee.id)
      .first<{ n: number }>();
    expect(events?.n).toBe(1);

    const snapshot = await fetchLive(
      `/api/live/${workshopId}/state?t=${encodeURIComponent(referee.token)}`,
    );
    const body = await snapshot.json<{ attendance: number; checkedIn: boolean }>();
    expect(body.checkedIn).toBe(true);
    expect(body.attendance).toBeGreaterThanOrEqual(1);
  });

  it("rejects check-in for an anonymous socket", async () => {
    const client = await openWs("");
    client.send({ type: "join" });
    client.send({ type: "checkin" });
    const error = await client.waitForWhere(
      (msg) => msg.type === "error" && msg.code === "UNAUTHORIZED",
      "unauthenticated check-in error",
    );
    expect(error.type).toBe("error");
  });

  it("routes stuck requests to the host queue and resolves them", async () => {
    const host = await openWs("?role=host", await adminCookie());
    const participant = await openWs("");
    participant.send({ type: "join", name: "Stuck Student" });
    participant.send({ type: "stuck", note: "Deploy fails" });

    const queue = await host.waitForWhere(
      (msg) => msg.type === "stuck_queue" && msg.items.some((item) => item.note === "Deploy fails"),
      "stuck queue entry",
    );
    if (queue.type !== "stuck_queue") throw new Error("unreachable");
    const entry = queue.items.find((item) => item.note === "Deploy fails");
    expect(entry?.name).toBe("Stuck S.");

    host.send({ type: "resolve_stuck", entryId: entry!.id });
    const resolved = await host.waitForWhere(
      (msg) => msg.type === "stuck_queue" && !msg.items.some((item) => item.id === entry!.id),
      "resolved queue",
    );
    expect(resolved.type).toBe("stuck_queue");
  });

  it("sends the existing queue and feed to a host who joins late", async () => {
    const participant = await openWs("");
    participant.send({ type: "join", name: "Early Bird" });
    participant.send({ type: "stuck", note: "Late join check" });
    participant.send({ type: "shipped", url: "https://late.example/app" });

    const host = await openWs("?role=host", await adminCookie());
    host.send({ type: "join" });
    const queue = await host.waitForWhere(
      (msg) =>
        msg.type === "stuck_queue" && msg.items.some((item) => item.note === "Late join check"),
      "late stuck queue",
    );
    expect(queue.type).toBe("stuck_queue");
    const feed = await host.waitForWhere(
      (msg) =>
        msg.type === "shipped_feed" &&
        msg.items.some((item) => item.url === "https://late.example/app"),
      "late shipped feed",
    );
    expect(feed.type).toBe("shipped_feed");
  });

  it("sends the active poll to a participant who joins late", async () => {
    const host = await openWs("?role=host", await adminCookie());
    host.send({ type: "launch_poll", question: "Late poll?", options: ["Yes", "No"] });

    const late = await openWs("");
    late.send({ type: "join" });
    const poll = await late.waitFor("poll");
    expect(poll.question).toBe("Late poll?");
    expect(poll.options).toEqual(["Yes", "No"]);
  });

  it("shows shipped projects on the host feed", async () => {
    const host = await openWs("?role=host", await adminCookie());
    const participant = await openWs("");
    participant.send({ type: "join", name: "Shipper" });
    participant.send({ type: "shipped", url: "https://demo.example/app" });
    const feed = await host.waitForWhere(
      (msg) =>
        msg.type === "shipped_feed" &&
        msg.items.some((item) => item.url === "https://demo.example/app"),
      "shipped feed",
    );
    expect(feed.type).toBe("shipped_feed");
  });

  it("scores quiz answers once and publishes a leaderboard", async () => {
    const host = await openWs("?role=host", await adminCookie());
    const player = await openWs("");
    player.send({ type: "join", name: "Quiz Whiz" });

    host.send({
      type: "launch_quiz",
      question: "What is 2+2?",
      options: ["3", "4", "5"],
      correct: 1,
    });
    const quiz = await player.waitFor("quiz");
    player.send({ type: "quiz_answer", questionId: quiz.questionId, option: 1 });

    await host.waitForWhere(
      (msg) => msg.type === "quiz" && msg.questionId === quiz.questionId && msg.counts[1] === 1,
      "quiz counts",
    );
    await host.waitForWhere(
      (msg) => msg.type === "leaderboard" && msg.rows.some((row) => row.score === 1),
      "leaderboard score 1",
    );

    player.send({ type: "quiz_answer", questionId: quiz.questionId, option: 0 });
    const duplicate = await player.waitForWhere(
      (msg) => msg.type === "error" && msg.code === "CONFLICT",
      "duplicate answer error",
    );
    expect(duplicate.type).toBe("error");

    host.send({ type: "launch_quiz", question: "What is 3+3?", options: ["5", "6"], correct: 1 });
    const second = await player.waitForWhere(
      (msg) => msg.type === "quiz" && msg.questionId !== quiz.questionId,
      "second quiz",
    );
    if (second.type !== "quiz") throw new Error("unreachable");
    player.send({ type: "quiz_answer", questionId: second.questionId, option: 1 });
    await host.waitForWhere(
      (msg) => msg.type === "leaderboard" && msg.rows.some((row) => row.score === 2),
      "leaderboard score 2",
    );
  });

  it("updates poll counts as answers arrive", async () => {
    const host = await openWs("?role=host", await adminCookie());
    const first = await openWs("");
    const second = await openWs("");
    first.send({ type: "join", name: "Poll One" });
    second.send({ type: "join", name: "Poll Two" });

    host.send({ type: "launch_poll", question: "Tea or coffee?", options: ["Tea", "Coffee"] });
    const poll = await first.waitFor("poll");
    first.send({ type: "poll_answer", questionId: poll.questionId, option: 0 });
    await host.waitForWhere(
      (msg) => msg.type === "poll" && msg.questionId === poll.questionId && msg.counts[0] === 1,
      "first poll count",
    );
    second.send({ type: "poll_answer", questionId: poll.questionId, option: 1 });
    await host.waitForWhere(
      (msg) =>
        msg.type === "poll" &&
        msg.questionId === poll.questionId &&
        msg.counts[0] === 1 &&
        msg.counts[1] === 1,
      "both poll counts",
    );
  });

  it("coalesces a burst of joins to at most two state messages per socket per second", async () => {
    const burst = await Promise.all(Array.from({ length: 10 }, () => openWs("")));
    const observer = burst[0];
    const start = Date.now();
    for (const client of burst) client.send({ type: "join", name: "Burst" });
    await new Promise((resolve) => setTimeout(resolve, 900));

    const states = observer.log
      .filter((entry) => entry.msg.type === "state")
      .map((entry) => entry.at);
    const inFirstSecond = states.filter((at) => at <= start + 1000);
    expect(inFirstSecond.length).toBeLessThanOrEqual(2);
    for (let i = 1; i < states.length; i += 1) {
      expect(states[i] - states[i - 1]).toBeGreaterThanOrEqual(400);
    }
  });
});
