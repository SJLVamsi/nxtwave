/**
 * WS1 — public API: register, me, stats, leaderboards, events, colleges, ambassador kit.
 * Phase 0 stub: health + public stats only. WS1 replaces the rest.
 */
import { Hono } from "hono";
import { TARGET_REGISTRATIONS } from "../../shared/plan";
import { ERROR_CODES } from "../../shared/errors";
import type { AppContext } from "../env";
import { count } from "../lib/db";
import { apiError, json } from "../lib/http";

const app = new Hono<AppContext>();

app.get("/health", (_c) => json({ ok: true, service: "ship60" }));

app.get("/stats/public", async (c) => {
  const registrations = await count(c.env.DB, "SELECT COUNT(*) AS n FROM users WHERE is_simulated = 0");
  const colleges = await count(
    c.env.DB,
    "SELECT COUNT(DISTINCT college_id) AS n FROM users WHERE is_simulated = 0 AND college_id IS NOT NULL",
  );
  return json({
    registrations,
    colleges,
    workshopStartIso: c.env.WORKSHOP_START_ISO,
    target: Number(c.env.TARGET_REGISTRATIONS ?? TARGET_REGISTRATIONS),
  });
});

app.all("*", (_c) => apiError(ERROR_CODES.NOT_FOUND, "Not implemented yet (WS1)."));

export default app;
