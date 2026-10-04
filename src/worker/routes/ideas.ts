/** WS2 — idea engine. Phase 0 stub. */
import { Hono } from "hono";
import { ERROR_CODES } from "../../shared/errors";
import type { AppContext } from "../env";
import { apiError } from "../lib/http";

const app = new Hono<AppContext>();

app.all("*", (_c) => apiError(ERROR_CODES.NOT_FOUND, "Not implemented yet (WS2)."));

export default app;
