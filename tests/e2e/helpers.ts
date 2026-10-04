/**
 * WS9 e2e helpers. Specs are written against `src/shared/contracts.ts` and the
 * PRD route/copy contract, so they stay valid while feature UI is built.
 *
 * Feature-blocked specs must call `endpointGaps` first and `test.skip` with the
 * returned reason — a skip always names the workstream it waits on, never a
 * silent pass (WS9 brief).
 */
import {
  request as playwrightRequest,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { RegisterResponseSchema, type RegisterResponse } from "../../src/shared/contracts";

export const BASE_URL = "http://localhost:5173";
export const ADMIN_PASSWORD = "test-admin-password";
export const WORKSHOP_ID = "ship60-2026-10-11";

/**
 * Distinct simulated clients per test. `/api/register` is rate-limited by IP
 * hash (5/hour) and flags an IP after 5 registrations/hour, so repeated local
 * runs would otherwise 429 or `ip_velocity`-flag test users. Locally
 * `cf-connecting-ip` is trusted; at the edge Cloudflare overwrites it.
 *
 * Random per call (not a counter): Playwright runs specs across worker
 * processes and local KV counters survive between runs, so any predictable IP
 * gets exhausted by repeated `npm run e2e` runs within the hour.
 */
export function fakeClientIp(): string {
  const value = Math.floor(Math.random() * 0xfffe00);
  return `10.${(value >> 16) & 0xff}.${(value >> 8) & 0xff}.${(value & 0xfe) + 1}`;
}

export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export function uniquePhone(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  return `9${digits}`;
}

export interface EndpointCheck {
  /** Workstream named in the skip reason, e.g. "WS1 POST /api/register". */
  module: string;
  method?: "GET" | "POST";
  path: string;
  data?: unknown;
  /** Statuses that prove the route is implemented (404 always means not landed). */
  ok: number[];
}

async function fetchStatus(request: APIRequestContext, check: EndpointCheck): Promise<number> {
  // Up to 3 attempts: the Vite plugin restarts the Worker on every config/source
  // change and a request landing in that window can 404 even for a live route.
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await request.fetch(check.path, {
        method: check.method ?? "GET",
        data: check.data,
        failOnStatusCode: false,
        timeout: 15_000,
      });
      lastStatus = response.status();
      if (lastStatus !== 404) return lastStatus;
    } catch {
      lastStatus = 0;
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 750));
  }
  return lastStatus;
}

export async function endpointGaps(
  request: APIRequestContext,
  checks: EndpointCheck[],
): Promise<string[]> {
  const gaps: string[] = [];
  for (const check of checks) {
    const status = await fetchStatus(request, check);
    if (!check.ok.includes(status)) {
      gaps.push(`${check.module} → ${status === 0 ? "unreachable" : status} (expected ${check.ok.join("/")})`);
    }
  }
  return gaps;
}

export function blockedReason(gaps: string[]): string {
  return `BLOCKED — route not reachable: ${gaps.join("; ")} (404 = not landed or shadowed by an earlier mount)`;
}

/**
 * Fails with the Vite error text when the dev server cannot compile a module.
 * Without this, a compile error surfaces as a misleading locator timeout (or an
 * axe violation on Vite's own overlay) instead of naming the broken file.
 */
export async function assertAppRendered(page: Page, context: string): Promise<void> {
  const overlay = page.locator("vite-error-overlay");
  if ((await overlay.count()) === 0) return;
  const text = (await overlay.innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 400);
  throw new Error(`${context}: Vite dev-server error overlay is showing — ${text || "no details"}`);
}

export interface RegisteredUser {
  data: RegisterResponse;
  context: APIRequestContext;
}

/** Registers a user through the WS1 API. Caller disposes `context`. */
export async function registerViaApi(options: {
  name: string;
  email?: string;
  phone?: string;
  refCode?: string;
  clientIp?: string;
}): Promise<RegisteredUser> {
  const context = await playwrightRequest.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { "cf-connecting-ip": options.clientIp ?? fakeClientIp() },
  });
  const response = await context.post("/api/register", {
    failOnStatusCode: false,
    data: {
      name: options.name,
      email: options.email ?? uniqueEmail("e2e.ref"),
      phone: options.phone ?? uniquePhone(),
      branch: "CSE/IT/AI-ML",
      gradYear: 2027,
      collegeOther: "E2E Test College",
      ideaKey: "e2e-smoke",
      refCode: options.refCode,
      consent: true,
      utmSource: "e2e",
    },
  });
  const body = await response.text();
  if (response.status() !== 200) {
    throw new Error(`WS1 POST /api/register failed (${response.status()}): ${body}`);
  }
  const data = RegisterResponseSchema.parse(JSON.parse(body));
  return { data, context };
}

/** API context authenticated with a user token (cookie `s60_token`). */
export async function apiContextForToken(
  token: string,
  clientIp = fakeClientIp(),
): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { "cf-connecting-ip": clientIp },
    storageState: {
      cookies: [
        {
          name: "s60_token",
          value: token,
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  });
}

export async function addTokenCookie(context: BrowserContext, token: string): Promise<void> {
  await context.addCookies([{ name: "s60_token", value: token, url: BASE_URL }]);
}
