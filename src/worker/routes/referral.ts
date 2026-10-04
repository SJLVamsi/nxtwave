/** WS1 — /r/:code referral landing HTML with OG tags + ref cookie. Phase 0 stub. */
import { Hono } from "hono";
import { ERROR_CODES } from "../../shared/errors";
import type { AppContext } from "../env";
import { apiError } from "../lib/http";

const app = new Hono<AppContext>();

app.get("/r/:code", (_c) => apiError(ERROR_CODES.NOT_FOUND, "Not implemented yet (WS1 referral)."));

export default app;
