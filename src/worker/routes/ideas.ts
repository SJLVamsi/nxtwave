/** WS2 — idea preview route, mounted at /api/ideas (see src/worker/index.ts). */
import { Hono } from "hono";
import { COOKIE_ANON } from "../../shared/constants";
import { IdeaPreviewRequestSchema } from "../../shared/contracts";
import { ERROR_CODES } from "../../shared/errors";
import type { AppContext } from "../env";
import { getCookie, sha256Hex } from "../lib/auth";
import { apiError, json, parseJsonBody } from "../lib/http";
import { getIdeaPreview, pickVariant } from "../lib/ideas/engine";
import { clientIp } from "../lib/ratelimit";

const app = new Hono<AppContext>();

app.post("/preview", async (c) => {
  const parsed = await parseJsonBody(c.req.raw, IdeaPreviewRequestSchema);
  if (!parsed.ok) return parsed.response;

  const { branch, interest } = parsed.data;
  const ip = clientIp(c.req.raw);
  const ipHash = await sha256Hex(`idea-ip:${ip}`);
  const variant = parsed.data.variant ?? pickVariant(variantSeed(c.req.raw, ip));

  const result = await getIdeaPreview(c.env, { branch, interest, variant, ipHash });
  if (result.kind === "rate_limited") {
    const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    return apiError(ERROR_CODES.RATE_LIMITED, undefined, {
      "retry-after": String(retryAfterSeconds),
    });
  }

  return json({ idea: result.idea });
});

/** Anonymous seed: client anon id first, then the anon cookie, then the IP. */
function variantSeed(request: Request, ip: string): string {
  const header = request.headers.get("x-anon-id")?.trim();
  if (header && header.length <= 64) return `anon:${header}`;
  const cookie = getCookie(request, COOKIE_ANON);
  if (cookie) return `anon:${cookie}`;
  return `ip:${ip}`;
}

export default app;
