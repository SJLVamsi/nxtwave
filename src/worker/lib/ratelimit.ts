/**
 * KV counter rate limiter. Fixed-window per key; good enough for public POSTs
 * and cheap on the free tier.
 */

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

export async function rateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number,
  nowMs = Date.now(),
): Promise<RateLimitResult> {
  const bucket = Math.floor(nowMs / 1000 / windowSeconds);
  const storageKey = `rl:${key}:${bucket}`;
  const resetAt = (bucket + 1) * windowSeconds * 1000;

  const current = Number((await kv.get(storageKey)) ?? 0);
  if (Number.isFinite(current) && current >= limit) {
    return { ok: false, remaining: 0, limit, resetAt };
  }

  await kv.put(storageKey, String((Number.isFinite(current) ? current : 0) + 1), {
    expirationTtl: windowSeconds + 10,
  });
  return { ok: true, remaining: Math.max(0, limit - current - 1), limit, resetAt };
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}
