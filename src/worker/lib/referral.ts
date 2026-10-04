/**
 * Referral qualification — the single function WS1 owns and WS6 calls on check-in.
 * A pending referral becomes qualified when the referee checks in.
 */
import { nowIso } from "./db";

export interface QualificationResult {
  qualified: boolean;
  referrerId: string | null;
}

export async function qualifyReferral(
  db: D1Database,
  refereeUserId: string,
): Promise<QualificationResult> {
  const referral = await db
    .prepare(
      "SELECT id, referrer_id, status FROM referrals WHERE referee_id = ? LIMIT 1",
    )
    .bind(refereeUserId)
    .first<{ id: string; referrer_id: string; status: string }>();

  if (!referral || referral.status !== "pending") {
    return { qualified: false, referrerId: referral?.referrer_id ?? null };
  }

  const result = await db
    .prepare(
      "UPDATE referrals SET status = 'qualified', qualified_at = ? WHERE id = ? AND status = 'pending'",
    )
    .bind(nowIso(), referral.id)
    .run();

  const changed = (result.meta.changes ?? 0) > 0;
  return { qualified: changed, referrerId: referral.referrer_id };
}
