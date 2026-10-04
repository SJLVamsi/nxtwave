/**
 * Mobile landing e2e — PRD M1 / §7: 390×844, no horizontal scroll, and the
 * registration fields reachable. Runs on the mobile project only.
 */
import { test, expect } from "@playwright/test";
import { assertAppRendered } from "./helpers";
import { landing } from "./selectors";

test("landing at 390×844: no horizontal scroll, form reachable (WS3)", async ({ page }) => {
  await page.goto("/");
  await assertAppRendered(page, "WS3 landing");
  await expect(
    landing(page).stub,
    "WS3 landing: page is still the Phase 0 stub — landing not built",
  ).toHaveCount(0);

  const layout = await page.evaluate<{ scrollWidth: number; clientWidth: number }>(`({
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    clientWidth: document.documentElement.clientWidth,
  })`);
  expect(
    layout.scrollWidth,
    `WS3 landing: horizontal overflow at 390px (scrollWidth ${layout.scrollWidth} > ${layout.clientWidth})`,
  ).toBeLessThanOrEqual(layout.clientWidth + 1);

  const form = landing(page);
  for (const [label, field] of [
    ["Name", form.name],
    ["Email", form.email],
    ["WhatsApp number", form.phone],
    ["College", form.college],
    ["Branch", form.branch],
    ["Consent checkbox", form.consent],
  ] as const) {
    await expect(field, `WS3 landing registration form: ${label} field must be reachable`).toBeVisible();
    await field.scrollIntoViewIfNeeded();
  }
  await expect(form.submit, "WS3 landing registration form: submit button").toBeVisible();
});
