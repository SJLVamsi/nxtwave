import {
  COOKIE_ANON,
  COOKIE_REF,
  type EventType,
  type WhatsAppVariant,
} from "../../../shared/constants";

const ANON_COOKIE_DAYS = 365;
const MAX_UTM_LENGTH = 120;

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86_400}; Path=/; SameSite=Lax`;
}

export function getAnonId(): string {
  const existing = readCookie(COOKIE_ANON);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  writeCookie(COOKIE_ANON, id, ANON_COOKIE_DAYS);
  return id;
}

export interface UtmParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}

export interface Attribution {
  refCode?: string;
  shareVariant?: WhatsAppVariant;
  utm: UtmParams;
}

function clean(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, MAX_UTM_LENGTH);
  return trimmed.length > 0 ? trimmed : undefined;
}

/** `ref` + `v` from the query string win; the s60_ref cookie is the fallback. */
export function readAttribution(search: string): Attribution {
  const params = new URLSearchParams(search);
  const refCode = clean(params.get("ref")) ?? readCookie(COOKIE_REF) ?? undefined;
  const variantParam = params.get("v");
  const shareVariant =
    variantParam === "en" || variantParam === "te" || variantParam === "fomo"
      ? variantParam
      : undefined;
  return {
    refCode,
    shareVariant,
    utm: {
      utmSource: clean(params.get("utm_source")),
      utmMedium: clean(params.get("utm_medium")),
      utmCampaign: clean(params.get("utm_campaign")),
      utmContent: clean(params.get("utm_content")),
    },
  };
}

export function trackEvent(
  type: EventType,
  props?: Record<string, unknown>,
  utm?: UtmParams,
): void {
  try {
    const body = {
      type,
      anonId: getAnonId(),
      ...(props ? { props } : {}),
      ...(utm ?? {}),
    };
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Analytics must never break the page.
  }
}

let pageViewSent = false;

/** Fire page_view once per page load, even with StrictMode's double mount. */
export function trackPageView(utm: UtmParams): void {
  if (pageViewSent) return;
  pageViewSent = true;
  trackEvent("page_view", undefined, utm);
}
