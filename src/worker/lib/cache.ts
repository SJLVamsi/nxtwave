/**
 * KV JSON cache with a loader (PRD §6.1: leaderboards and public stats cached 60 s).
 * Tenant-free keys only; callers prefix namespaces (e.g. `leaderboard:students`).
 */

export async function cachedJson<T>(
  kv: KVNamespace,
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = await kv.get(key);
  if (hit) {
    try {
      return JSON.parse(hit) as T;
    } catch {
      // Corrupt cache entry: fall through and rebuild it.
    }
  }
  const value = await load();
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
  return value;
}
