/**
 * Ids, ref codes and seat assignment.
 */

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function newId(prefix?: string): string {
  const id = crypto.randomUUID().replace(/-/g, "");
  return prefix ? `${prefix}_${id}` : id;
}

export function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export function randomBase32(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += BASE32[bytes[i] % 32];
  return out;
}

/** First name (max 8 ASCII uppercase chars) + 3 random base32 chars, e.g. RAHUL7K2. */
export function refCodeFromName(name: string): string {
  const first = (name.trim().split(/\s+/)[0] ?? "S60")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const base = first.length >= 2 ? first : "S60";
  return `${base}${randomBase32(3)}`;
}

/** Deterministic-ish short id for events and fixtures. */
export function shortId(length = 10): string {
  return randomBase32(length);
}

export function nextSeatNoSql(): string {
  return "SELECT COALESCE(MAX(seat_no), 0) + 1 AS next FROM users";
}

export async function nextSeatNo(db: D1Database): Promise<number> {
  const row = await db
    .prepare(nextSeatNoSql())
    .first<{ next: number }>();
  return row?.next ?? 1;
}

/**
 * Run an insert that consumes a seat number, retrying on seat_no unique conflict.
 * The callback receives a fresh seat number per attempt.
 */
export async function withSeatRetry<T>(
  db: D1Database,
  attempts: number,
  fn: (seatNo: number) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    const seatNo = await nextSeatNo(db);
    try {
      return await fn(seatNo);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/UNIQUE constraint failed: users\.seat_no/i.test(message)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Seat assignment failed");
}

export function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlEncodeString(value: string): string {
  return base64Url(new TextEncoder().encode(value));
}

export function base64UrlDecodeString(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)));
}
