/**
 * Event recording helper (funnel analytics). Shared by all workstreams.
 * Parameterised inserts only.
 */
import type { EventType } from "../../shared/constants";
import { newId, shortId } from "./ids";
import { nowIso } from "./db";

export interface EventInput {
  type: EventType;
  userId?: string | null;
  anonId?: string | null;
  refCode?: string | null;
  props?: Record<string, unknown> | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  isSimulated?: boolean;
}

export async function recordEvent(db: D1Database, input: EventInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO events (id, type, anon_id, user_id, ref_code, props, utm_source, utm_medium, utm_campaign, is_simulated, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId("ev"),
      input.type,
      input.anonId ?? null,
      input.userId ?? null,
      input.refCode ?? null,
      input.props ? JSON.stringify(input.props) : null,
      input.utmSource ?? null,
      input.utmMedium ?? null,
      input.utmCampaign ?? null,
      input.isSimulated ? 1 : 0,
      nowIso(),
    )
    .run();
}

/** Anonymous id for visitors who have not registered (cookie-backed on the client). */
export function newAnonId(): string {
  return `a_${shortId(12)}`;
}
