import { Hono } from "hono";
import { ERROR_CODES } from "../shared/errors";
import type { AppContext, AppEnv } from "./env";
import { handleScheduled } from "./cron";
import { apiError, securityHeaders } from "./lib/http";
import adminRoutes from "./routes/admin";
import ideasRoutes from "./routes/ideas";
import liveRoutes from "./routes/live";
import ogRoutes from "./routes/og";
import publicRoutes from "./routes/public";
import referralRoutes from "./routes/referral";
import submissionRoutes, { certRoutes } from "./routes/submissions";

export { LiveRoom } from "./do/LiveRoom";

const app = new Hono<AppContext>();

app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
});

app.use("*", async (c, next) => {
  await next();
  c.res = securityHeaders(c.res);
});

app.route("/", referralRoutes);
app.route("/", ogRoutes);
app.route("/", certRoutes);
app.route("/api", publicRoutes);
app.route("/api/ideas", ideasRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/live", liveRoutes);
app.route("/api/submissions", submissionRoutes);

app.all("/api/*", (_c) => apiError(ERROR_CODES.NOT_FOUND, "No such API route."));

app.onError((error, c) => {
  console.error(`[${c.get("requestId")}]`, error);
  return apiError(ERROR_CODES.INTERNAL);
});

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
} satisfies ExportedHandler<AppEnv>;
