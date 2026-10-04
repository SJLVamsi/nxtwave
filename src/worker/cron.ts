/**
 * WS7 — Cron reminders (PRD M11). Phase 0 stub: logs only.
 */
import type { AppEnv } from "./env";

export async function handleScheduled(
  controller: ScheduledController,
  env: AppEnv,
  _ctx: ExecutionContext,
): Promise<void> {
  console.log(`[cron] tick ${controller.cron} at ${new Date(controller.scheduledTime).toISOString()}`, {
    workshopId: env.WORKSHOP_ID,
    emailEnabled: Boolean(env.RESEND_API_KEY),
  });
}
