/**
 * WS6 — live workshop API: WebSocket upgrade to LiveRoom + REST snapshot.
 */
import { Hono } from "hono";
import { COOKIE_TOKEN } from "../../shared/constants";
import { ERROR_CODES } from "../../shared/errors";
import type { AppContext, AppEnv } from "../env";
import { getCookie, getUserByToken, isAdmin } from "../lib/auth";
import { apiError, json } from "../lib/http";

const app = new Hono<AppContext>();

const WORKSHOP_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/;

function roomFor(env: AppEnv, workshopId: string) {
  return env.LIVE_ROOM.get(env.LIVE_ROOM.idFromName(workshopId));
}

function knownWorkshop(env: AppEnv, workshopId: string): boolean {
  return WORKSHOP_ID_PATTERN.test(workshopId) && workshopId === env.WORKSHOP_ID;
}

app.get("/current", (c) =>
  json({ workshopId: c.env.WORKSHOP_ID, workshopStartIso: c.env.WORKSHOP_START_ISO }),
);

app.get("/:workshopId/state", async (c) => {
  const workshopId = c.req.param("workshopId");
  if (!knownWorkshop(c.env, workshopId)) {
    return apiError(ERROR_CODES.NOT_FOUND, "Unknown workshop.");
  }
  const headers = new Headers();
  const token = c.req.query("t") ?? getCookie(c.req.raw, COOKIE_TOKEN);
  const user = await getUserByToken(c.env.DB, token);
  if (user) headers.set("x-s60-user-id", user.id);
  const res = await roomFor(c.env, workshopId).fetch("https://live.internal/state", { headers });
  return new Response(res.body, { status: res.status, headers: res.headers });
});

app.get("/:workshopId/ws", async (c) => {
  const workshopId = c.req.param("workshopId");
  if (!knownWorkshop(c.env, workshopId)) {
    return apiError(ERROR_CODES.NOT_FOUND, "Unknown workshop.");
  }
  if (c.req.header("upgrade")?.toLowerCase() !== "websocket") {
    return apiError(ERROR_CODES.INVALID_INPUT, "Expected a WebSocket upgrade.");
  }

  const headers = new Headers(c.req.raw.headers);
  headers.set("x-s60-workshop-id", workshopId);
  headers.set("x-s60-upgrade", "1");

  if (c.req.query("role") === "host") {
    if (!(await isAdmin(c.req.raw, c.env))) {
      return apiError(ERROR_CODES.UNAUTHORIZED, "Host access needs an admin session.");
    }
    headers.set("x-s60-role", "host");
  } else {
    headers.set("x-s60-role", "participant");
    const token = c.req.query("t") ?? getCookie(c.req.raw, COOKIE_TOKEN);
    const user = await getUserByToken(c.env.DB, token);
    if (user) {
      headers.set("x-s60-user-id", user.id);
      headers.set("x-s60-user-name", user.name);
    }
  }

  const upgrade = new Request("https://live.internal/ws", { method: "GET", headers });
  return roomFor(c.env, workshopId).fetch(upgrade);
});

app.all("*", (_c) => apiError(ERROR_CODES.NOT_FOUND, "No such live route."));

export default app;
