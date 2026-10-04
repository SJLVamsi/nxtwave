/**
 * Typed D1 helpers. Parameterised SQL only — never string-interpolate values.
 */

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  college_id: string | null;
  college_other: string | null;
  branch: string;
  grad_year: number;
  role: "student" | "ambassador";
  ref_code: string;
  referred_by: string | null;
  token_hash: string;
  seat_no: number;
  idea_key: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  share_variant: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  consent_at: string;
  flag_reason: string | null;
  flag_status: "open" | "approved" | "rejected" | null;
  is_simulated: number;
  created_at: string;
}

export interface CollegeRow {
  id: string;
  name: string;
  short_name: string;
  city: string | null;
  state: string | null;
}

export interface ReferralRow {
  id: string;
  referrer_id: string;
  referee_id: string;
  status: "pending" | "qualified" | "rejected";
  created_at: string;
  qualified_at: string | null;
  is_simulated: number;
}

export interface EventRow {
  id: string;
  type: string;
  anon_id: string | null;
  user_id: string | null;
  ref_code: string | null;
  props: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  is_simulated: number;
  created_at: string;
}

export interface CheckinRow {
  user_id: string;
  workshop_id: string;
  checked_in_at: string;
  is_simulated: number;
}

export interface SubmissionRow {
  id: string;
  user_id: string;
  live_url: string;
  repo_url: string | null;
  description: string | null;
  status: "queued" | "evaluated" | "failed" | "manual";
  score: number | null;
  evaluation: string | null;
  cert_id: string | null;
  is_simulated: number;
  created_at: string;
}

export type SqlParam = string | number | null;

export async function first<T>(db: D1Database, sql: string, ...params: SqlParam[]): Promise<T | null> {
  return (await db.prepare(sql).bind(...params).first<T>()) ?? null;
}

export async function all<T>(db: D1Database, sql: string, ...params: SqlParam[]): Promise<T[]> {
  const result = await db.prepare(sql).bind(...params).all<T>();
  return result.results ?? [];
}

export async function run(db: D1Database, sql: string, ...params: SqlParam[]): Promise<D1Result> {
  return db.prepare(sql).bind(...params).run();
}

export async function count(db: D1Database, sql: string, ...params: SqlParam[]): Promise<number> {
  const row = await first<{ n: number }>(db, sql, ...params);
  return row?.n ?? 0;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toBool(value: number | boolean | null | undefined): boolean {
  return value === 1 || value === true;
}

/** Build `AND ...` fragments safely for optional filters. */
export function simFilter(includeSimulated: boolean, column = "is_simulated"): string {
  return includeSimulated ? "" : ` AND ${column} = 0`;
}
