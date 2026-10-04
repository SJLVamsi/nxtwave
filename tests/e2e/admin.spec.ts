/**
 * Admin war room e2e — PRD M6 / §8 item 3. Desktop project only.
 * Login password is the e2e test value bootstrapped into `.dev.vars` by
 * `playwright.config.ts` (matches `tests/worker`).
 */
import { test, expect } from "@playwright/test";
import {
  ADMIN_PASSWORD,
  assertAppRendered,
  blockedReason,
  endpointGaps,
  fakeClientIp,
} from "./helpers";
import { admin } from "./selectors";

test("admin login shows headline numbers, pacing chart and flags queue (WS5)", async ({
  page,
  request,
}) => {
  const gaps = await endpointGaps(request, [
    {
      module: "WS5 POST /api/admin/login",
      method: "POST",
      path: "/api/admin/login",
      data: {},
      ok: [400, 401, 429],
    },
  ]);
  test.skip(gaps.length > 0, blockedReason(gaps));

  // Fresh IP per run: the admin-login limiter (10/h/IP) survives between local
  // runs in the persistent KV, so a fixed IP exhausts itself after a few runs.
  await page.setExtraHTTPHeaders({ "cf-connecting-ip": fakeClientIp() });
  await page.goto("/admin");
  await assertAppRendered(page, "WS5 /admin");
  const ui = admin(page);

  await expect(ui.password, "WS5 /admin: password field").toBeVisible({ timeout: 20_000 });
  await ui.password.fill(ADMIN_PASSWORD);
  await ui.login.click();

  await expect(ui.headline, "WS5 /admin: headline numbers must render after login").toBeVisible({
    timeout: 20_000,
  });
  await expect(ui.chart, "WS5 /admin: pacing chart (Recharts) must render").toBeVisible();
  await expect(ui.flags, "WS5 /admin: flags queue must load").toBeVisible();
});
