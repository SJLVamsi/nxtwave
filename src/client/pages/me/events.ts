/**
 * WS4 — best-effort analytics beacon (PRD M3 step 5). Never blocks a share.
 */
import type { EventType } from "../../../shared/constants";

const ANON_COOKIE = "s60_anon";

function anonId(): string {
  const match = document.cookie.match(/(?:^|;\s*)s60_anon=([^;]+)/);
  if (match?.[1]) return decodeURIComponent(match[1]);
  const id = crypto.randomUUID();
  document.cookie = `${ANON_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  return id;
}

export function trackEvent(type: EventType, props?: Record<string, unknown>): void {
  let payload: string;
  try {
    payload = JSON.stringify({ type, props, anonId: anonId() });
  } catch {
    return;
  }
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon("/api/events", blob)) return;
    }
  } catch {
    /* fall through to fetch */
  }
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* best effort */
  }
}
