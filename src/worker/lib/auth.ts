/**
 * Token hashing, user lookup, admin session cookies.
 * Tokens are stored only as SHA-256 hashes (PRD M3).
 */
import { ADMIN_SESSION_HOURS, COOKIE_ADMIN, COOKIE_TOKEN } from "../../shared/constants";
import type { AppEnv } from "../env";
import { first, type UserRow } from "./db";
import { base64Url, base64UrlDecodeString, base64UrlEncodeString } from "./ids";

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashToken(token: string): Promise<string> {
  return sha256Hex(`s60:${token}`);
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  return sha256Hex(`ip:${salt}:${ip}`);
}

/**
 * Salt for hashed IPs. Prefers real secrets; the constant fallback only ever
 * applies in local dev where no secret is configured (PRD §7 pseudonymised IPs).
 */
export function ipHashSalt(env: AppEnv): string {
  return env.SESSION_SECRET || env.ADMIN_PASSWORD || "ship60-local-ip-salt";
}

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export interface CookieOptions {
  maxAgeSeconds?: number;
  httpOnly?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
  secure?: boolean;
}

export function buildSetCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? "/"}`);
  parts.push(`SameSite=${options.sameSite ?? "Lax"}`);
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.secure !== false) parts.push("Secure");
  if (options.maxAgeSeconds !== undefined) parts.push(`Max-Age=${options.maxAgeSeconds}`);
  return parts.join("; ");
}

export function buildClearCookie(name: string): string {
  return `${name}=; Path=/; SameSite=Lax; HttpOnly; Secure; Max-Age=0`;
}

export async function getUserByToken(db: D1Database, token: string | null | undefined): Promise<UserRow | null> {
  if (!token || token.length < 10) return null;
  const tokenHash = await hashToken(token);
  return first<UserRow>(db, "SELECT * FROM users WHERE token_hash = ?", tokenHash);
}

export async function getAuthedUser(request: Request, env: AppEnv): Promise<UserRow | null> {
  const header = request.headers.get("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  const token = bearer ?? getCookie(request, COOKIE_TOKEN);
  return getUserByToken(env.DB, token);
}

/** Token from `?t=`, `Authorization: Bearer`, or the s60_token cookie (M3). */
export function tokenFromRequest(request: Request): string | null {
  const queryToken = new URL(request.url).searchParams.get("t");
  if (queryToken) return queryToken;
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return getCookie(request, COOKIE_TOKEN);
}

export async function getUserFromRequest(request: Request, env: AppEnv): Promise<UserRow | null> {
  return getUserByToken(env.DB, tokenFromRequest(request));
}

/* ------------------------------ admin session ------------------------------ */

interface AdminPayload {
  exp: number;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signAdminSession(secret: string, nowMs = Date.now()): Promise<string> {
  const payload: AdminPayload = {
    exp: Math.floor(nowMs / 1000) + ADMIN_SESSION_HOURS * 3600,
  };
  const encoded = base64UrlEncodeString(JSON.stringify(payload));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  return `${encoded}.${base64Url(new Uint8Array(sig))}`;
}

export async function verifyAdminSession(secret: string, value: string | null, nowMs = Date.now()): Promise<boolean> {
  if (!value) return false;
  const [encoded, sig] = value.split(".");
  if (!encoded || !sig) return false;
  let payload: AdminPayload;
  try {
    payload = JSON.parse(base64UrlDecodeString(encoded)) as AdminPayload;
  } catch {
    return false;
  }
  if (typeof payload.exp !== "number" || payload.exp * 1000 < nowMs) return false;
  const key = await hmacKey(secret);
  const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  const expectedB64 = base64Url(new Uint8Array(expected));
  return timingSafeEqual(expectedB64, sig);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isAdmin(request: Request, env: AppEnv): Promise<boolean> {
  if (!env.SESSION_SECRET) return false;
  return verifyAdminSession(env.SESSION_SECRET, getCookie(request, COOKIE_ADMIN));
}

/** First name + last initial only — never expose email/phone on public surfaces. */
export function publicName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
