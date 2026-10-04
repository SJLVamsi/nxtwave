/**
 * WS7 — Cron reminders (PRD M11). Runs every 15 minutes.
 *
 * Three reminders derived from WORKSHOP_START_ISO: D-1 (start −24 h, i.e. the
 * previous evening for a 19:00 IST start), 2 h before, 15 min before. Each one
 * is claimed at most once per workshop and always stored in KV under
 * `reminder:{kind}` so the admin war room (WS5) can surface the message for
 * ambassadors to paste into groups. If RESEND_API_KEY is set, registered
 * students also get an email via the Resend HTTP API. Nothing here is allowed
 * to throw: every step is logged and swallowed.
 */
import type { AppEnv } from "./env";
import { all, count } from "./lib/db";

const HOUR_MS = 60 * 60 * 1000;
const WINDOW_MS = 30 * 60 * 1000;
const MAX_EMAILS_PER_REMINDER = 100;

export const REMINDER_SPECS = [
  { kind: "d1", label: "D-1 evening", offsetMs: -24 * HOUR_MS },
  { kind: "h2", label: "2 hours before", offsetMs: -2 * HOUR_MS },
  { kind: "m15", label: "15 minutes before", offsetMs: -15 * 60 * 1000 },
] as const;

export type ReminderKind = (typeof REMINDER_SPECS)[number]["kind"];

export interface ReminderRecord {
  kind: ReminderKind;
  label: string;
  workshopId: string;
  dueAt: string;
  message: string;
  ambassadorNote?: string;
  sentAt: string;
  channel: "resend" | "log";
  recipientsSent?: number;
  recipientsFailed?: number;
}

/**
 * Student-facing reminder. No registration CTA (the student already has a seat),
 * no college/registration counts and no ambassador instructions — those live in
 * `ambassadorNote` for the admin war room (UX review H3).
 */
export function buildReminderMessage(
  env: AppEnv,
  _label: string,
  counts: { registrations: number; colleges: number; seat?: string | number | null },
): string {
  const startsAt = new Date(env.WORKSHOP_START_ISO);
  const when = Number.isNaN(startsAt.getTime())
    ? "soon"
    : new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
        timeZoneName: "short",
      }).format(startsAt);
  const lines = [
    `Your NxtWave AI workshop starts ${when}.`,
    "Bring a laptop; you'll deploy your project live.",
  ];
  const seat = counts.seat === undefined || counts.seat === null ? "" : String(counts.seat).trim();
  if (seat) lines.push(`Your seat: ${seat}.`);
  return lines.join(" ");
}

/** Ambassador paste for the war room; null while counts are unknown/zero. */
export function buildAmbassadorNote(counts: { registrations: number; colleges: number }): string | null {
  if (counts.registrations <= 0 || counts.colleges <= 0) return null;
  return `${counts.registrations} students from ${counts.colleges} colleges have saved their seat. Post in your class group between 8 and 10 PM and ask the group admin first.`;
}

export async function handleScheduled(
  controller: ScheduledController,
  env: AppEnv,
  _ctx: ExecutionContext,
): Promise<void> {
  const now = controller.scheduledTime || Date.now();
  const startMs = new Date(env.WORKSHOP_START_ISO).getTime();
  if (!Number.isFinite(startMs)) {
    console.error("[cron] WORKSHOP_START_ISO is not a date; skipping reminders", env.WORKSHOP_START_ISO);
    return;
  }

  for (const spec of REMINDER_SPECS) {
    try {
      await maybeSendReminder(env, spec, startMs, now);
    } catch (error) {
      console.error(`[cron] reminder ${spec.kind} failed`, error);
    }
  }
}

async function maybeSendReminder(
  env: AppEnv,
  spec: (typeof REMINDER_SPECS)[number],
  startMs: number,
  now: number,
): Promise<void> {
  const dueMs = startMs + spec.offsetMs;
  if (now < dueMs || now >= dueMs + WINDOW_MS) return;

  const dueAt = new Date(dueMs).toISOString();
  const key = `reminder:${spec.kind}`;
  const existing = (await env.CACHE.get(key, "json")) as ReminderRecord | null;
  if (existing && existing.workshopId === env.WORKSHOP_ID && existing.dueAt === dueAt) return;

  const registrations = await count(env.DB, "SELECT COUNT(*) AS n FROM users WHERE is_simulated = 0");
  const colleges = await count(
    env.DB,
    "SELECT COUNT(DISTINCT college_id) AS n FROM users WHERE is_simulated = 0 AND college_id IS NOT NULL",
  );
  const message = buildReminderMessage(env, spec.label, { registrations, colleges });
  const ambassadorNote = buildAmbassadorNote({ registrations, colleges });

  let channel: ReminderRecord["channel"] = "log";
  let recipientsSent: number | undefined;
  let recipientsFailed: number | undefined;
  if (env.RESEND_API_KEY) {
    channel = "resend";
    const result = await sendReminderEmails(env, spec.label, message);
    recipientsSent = result.sent;
    recipientsFailed = result.failed;
  }

  const record: ReminderRecord = {
    kind: spec.kind,
    label: spec.label,
    workshopId: env.WORKSHOP_ID,
    dueAt,
    message,
    ...(ambassadorNote ? { ambassadorNote } : {}),
    sentAt: new Date(now).toISOString(),
    channel,
    ...(recipientsSent !== undefined ? { recipientsSent } : {}),
    ...(recipientsFailed !== undefined ? { recipientsFailed } : {}),
  };

  try {
    await env.CACHE.put(key, JSON.stringify(record), { expirationTtl: 90 * 24 * 3600 });
  } catch (error) {
    console.error(`[cron] could not store ${key}`, error);
  }
  console.log(`[cron] reminder ${spec.kind} (${spec.label}) via ${channel}`, {
    dueAt,
    registrations,
    recipientsSent,
    recipientsFailed,
  });
}

async function sendReminderEmails(
  env: AppEnv,
  label: string,
  message: string,
): Promise<{ sent: number; failed: number }> {
  const rows = await all<{ email: string }>(
    env.DB,
    "SELECT email FROM users WHERE is_simulated = 0 AND email IS NOT NULL ORDER BY created_at LIMIT ?",
    MAX_EMAILS_PER_REMINDER,
  );
  const subject = `Ship60 reminder — ${label}`;
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: "Ship60 <onboarding@resend.dev>",
          to: [row.email],
          subject,
          text: message,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { sent, failed };
}
