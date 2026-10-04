/**
 * WS6 live-room load check — opens N concurrent sockets against a running dev
 * server. Not part of `npm test` (the vitest include only picks up *.test.ts).
 *
 * Usage:
 *   LIVE_TOKEN=<registered-user-token> npx tsx tests/worker/live-load.ts
 *
 * Env: LIVE_URL (default http://localhost:5173), LIVE_SOCKETS (default 500),
 *      WORKSHOP_ID (default ship60-2026-10-11), LIVE_TIMEOUT_MS (default 30000).
 */

interface SocketResult {
  connected: boolean;
  joined: boolean;
  checkedIn: boolean;
  stateMessages: number;
  errors: string[];
}

const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } })
  .process.env;
const liveUrl = (env.LIVE_URL ?? "http://localhost:5173").replace(/\/$/, "");
const token = env.LIVE_TOKEN ?? "";
const socketCount = Number(env.LIVE_SOCKETS ?? "500");
const workshopId = env.WORKSHOP_ID ?? "ship60-2026-10-11";
const timeoutMs = Number(env.LIVE_TIMEOUT_MS ?? "30000");
const wsBase = liveUrl.replace(/^http/, "ws");
const wsUrl = `${wsBase}/api/live/${workshopId}/ws${token ? `?t=${encodeURIComponent(token)}` : ""}`;

function runSocket(index: number): Promise<SocketResult> {
  return new Promise((resolve) => {
    const result: SocketResult = {
      connected: false,
      joined: false,
      checkedIn: false,
      stateMessages: 0,
      errors: [],
    };
    const ws = new WebSocket(wsUrl);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* already closed */
      }
      resolve(result);
    };
    const timer = setTimeout(() => {
      result.errors.push("timeout");
      finish();
    }, timeoutMs);

    ws.addEventListener("open", () => {
      result.connected = true;
      ws.send(JSON.stringify({ type: "join", name: `Load ${index}` }));
      result.joined = true;
      if (token) ws.send(JSON.stringify({ type: "checkin" }));
    });

    ws.addEventListener("message", (event) => {
      let message: { type?: string; code?: string; checkedIn?: boolean };
      try {
        message = JSON.parse(String(event.data)) as typeof message;
      } catch {
        result.errors.push("malformed_frame");
        return;
      }
      if (message.type === "state") {
        result.stateMessages += 1;
        if (message.checkedIn) result.checkedIn = true;
        if (!token || result.checkedIn) finish();
      } else if (message.type === "error") {
        result.errors.push(message.code ?? "error");
      }
    });

    ws.addEventListener("error", () => {
      result.errors.push("socket_error");
    });

    ws.addEventListener("close", (event) => {
      if (!result.connected || (token && !result.checkedIn)) {
        result.errors.push(`closed_${event.code}`);
      }
      finish();
    });
  });
}

async function main(): Promise<void> {
  const started = Date.now();
  console.log(`Opening ${socketCount} sockets against ${wsUrl} (checkin: ${token ? "yes" : "no"})`);
  const results = await Promise.all(
    Array.from({ length: socketCount }, (_, index) => runSocket(index)),
  );
  const summary = {
    sockets: socketCount,
    connected: results.filter((result) => result.connected).length,
    joined: results.filter((result) => result.joined).length,
    checkedIn: results.filter((result) => result.checkedIn).length,
    stateMessages: results.reduce((total, result) => total + result.stateMessages, 0),
    socketsWithErrors: results.filter((result) => result.errors.length > 0).length,
    errors: results.flatMap((result) => result.errors).slice(0, 20),
    durationMs: Date.now() - started,
  };
  console.log(JSON.stringify(summary, null, 2));
  const failed =
    summary.connected < socketCount ||
    summary.joined < socketCount ||
    summary.socketsWithErrors > 0 ||
    (token.length > 0 && summary.checkedIn === 0);
  if (failed) process.exitCode = 1;
}

await main();
