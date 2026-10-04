/**
 * Accessibility e2e — PRD §8 / §7: axe scan on `/`, `/me`, `/leaderboard`,
 * failing on serious and critical violations only.
 *
 * Phase 0 stub pages are skipped with the owning workstream named: scanning a
 * one-line placeholder proves nothing. The skip disappears automatically once
 * the real page replaces the stub.
 */
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import {
  BASE_URL,
  assertAppRendered,
  blockedReason,
  endpointGaps,
  fakeClientIp,
  registerViaApi,
} from "./helpers";

const SERIOUS = new Set(["serious", "critical"]);

interface Route {
  path: string;
  module: string;
  needsToken?: boolean;
}

const routes: Route[] = [
  { path: "/", module: "WS3 landing" },
  { path: "/leaderboard", module: "WS4 leaderboard" },
  { path: "/me", module: "WS4 launchpad", needsToken: true },
];

for (const route of routes) {
  test(`axe: ${route.path} has no serious/critical violations (${route.module})`, async ({
    page,
    request,
  }) => {
    if (route.needsToken) {
      const gaps = await endpointGaps(request, [
        {
          module: "WS1 POST /api/register",
          method: "POST",
          path: "/api/register",
          data: {},
          ok: [400, 409, 429],
        },
      ]);
      test.skip(gaps.length > 0, blockedReason(gaps));

      const user = await registerViaApi({ name: "Axe User", clientIp: fakeClientIp() });
      await page.context().addCookies([{ name: "s60_token", value: user.data.token, url: BASE_URL }]);
      await user.context.dispose();
      await page.goto(`/me?t=${encodeURIComponent(user.data.token)}`);
    } else {
      await page.goto(route.path);
    }

    await assertAppRendered(page, `${route.module} (${route.path})`);

    if (await page.getByText(/will replace this stub/i).count()) {
      test.skip(true, `BLOCKED — ${route.module} is still the Phase 0 stub; nothing meaningful to scan`);
    }

    // Scan the settled page, not the loading/skeleton frame.
    await page.waitForLoadState("networkidle").catch(() => undefined);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const violations = results.violations.filter((violation) => SERIOUS.has(violation.impact ?? ""));
    const report = violations.map((violation) => {
      const nodes = violation.nodes
        .slice(0, 3)
        .map((node) => `${node.target.join(" ")} :: ${node.html.slice(0, 120)}`)
        .join("\n    ");
      return `${violation.id} (${violation.impact}): ${violation.help}\n    ${nodes}`;
    });
    expect(report, `axe found serious/critical violations on ${route.path}`).toEqual([]);
  });
}
