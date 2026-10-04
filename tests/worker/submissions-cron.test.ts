import { createScheduledController, env } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";
import { buildReminderMessage, handleScheduled, REMINDER_SPECS } from "../../src/worker/cron";

const HOUR_MS = 60 * 60 * 1000;

async function tick(atIso: string) {
  await handleScheduled(
    createScheduledController({ scheduledTime: new Date(atIso), cron: "*/15 * * * *" }),
    env,
    {} as ExecutionContext,
  );
}

describe("cron reminders", () => {
  afterEach(async () => {
    for (const spec of REMINDER_SPECS) await env.CACHE.delete(`reminder:${spec.kind}`);
  });

  it("stores the 2-hour reminder when the tick lands in its window", async () => {
    const start = new Date(env.WORKSHOP_START_ISO).getTime();
    const due = new Date(start - 2 * HOUR_MS).toISOString();
    await tick(new Date(start - 2 * HOUR_MS + 5 * 60 * 1000).toISOString());

    const record = await env.CACHE.get<{ kind: string; channel: string; message: string; dueAt: string }>(
      "reminder:h2",
      "json",
    );
    expect(record).toMatchObject({ kind: "h2", channel: "log", dueAt: due });
    expect(record?.message).toContain("Register:");
    expect(record?.message).toContain("free workshop starts");
  });

  it("does nothing outside a reminder window", async () => {
    const start = new Date(env.WORKSHOP_START_ISO).getTime();
    await tick(new Date(start - 5 * HOUR_MS).toISOString());
    expect(await env.CACHE.get("reminder:h2")).toBeNull();
    expect(await env.CACHE.get("reminder:m15")).toBeNull();
  });

  it("claims each reminder once per workshop", async () => {
    const start = new Date(env.WORKSHOP_START_ISO).getTime();
    const first = new Date(start - 15 * 60 * 1000).toISOString();
    await tick(first);
    const stored = await env.CACHE.get<{ sentAt: string }>("reminder:m15", "json");
    await tick(new Date(new Date(first).getTime() + 60 * 1000).toISOString());
    const again = await env.CACHE.get<{ sentAt: string }>("reminder:m15", "json");
    expect(again?.sentAt).toBe(stored?.sentAt);
  });

  it("builds a plain-text message with real counts only", () => {
    const message = buildReminderMessage(env, "D-1 evening", { registrations: 320, colleges: 24 });
    expect(message).toContain("320 students from 24 colleges");
    expect(message).toContain(env.PUBLIC_BASE_URL);
    const empty = buildReminderMessage(env, "D-1 evening", { registrations: 0, colleges: 0 });
    expect(empty).toContain("Seats are open now.");
  });
});
