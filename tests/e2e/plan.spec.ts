/**
 * `/plan` growth deck e2e — PRD M12 / §8 item 5.
 * Runs on both projects; the deck is presented on desktop and swiped on mobile.
 * No API dependency: while WS8 is still the Phase 0 stub this spec fails with a
 * module-tagged assertion (it is a genuine, attributable failure, not a skip).
 */
import { test, expect } from "@playwright/test";
import { assertAppRendered } from "./helpers";
import { plan } from "./selectors";

test("growth deck: 5 slides, keyboard navigation, print stylesheet (WS8)", async ({ page }) => {
  await page.goto("/plan");
  await assertAppRendered(page, "WS8 /plan");
  await expect(
    plan(page).stub,
    "WS8 /plan: page is still the Phase 0 stub — deck not built",
  ).toHaveCount(0);

  const slides = plan(page);
  const count = await slides.slides.count();
  const deck = count > 0 ? slides.slides : slides.slidesFallback;
  await expect(deck, "WS8 /plan: the deck must render 5 slides (PRD M12)").toHaveCount(5);

  const visibleText = () => page.locator("body").innerText();
  const before = await visibleText();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(visibleText, {
      message: "WS8 /plan: ArrowRight must advance to the next slide",
      timeout: 5_000,
    })
    .not.toBe(before);

  const printRuleCount = await page.evaluate<number>(`(() => {
    let count = 0;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules = [];
      try {
        rules = Array.from(sheet.cssRules);
      } catch {
        continue;
      }
      for (const rule of rules) {
        if (rule.type === CSSRule.MEDIA_RULE && (rule.conditionText || "").includes("print")) count += 1;
        if (rule.type === CSSRule.PAGE_RULE) count += 1;
      }
    }
    return count;
  })()`);
  expect(printRuleCount, "WS8 /plan: print stylesheet (@media print or @page) must exist").toBeGreaterThan(0);
});
