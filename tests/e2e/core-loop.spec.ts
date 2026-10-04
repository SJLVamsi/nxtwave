/**
 * Core loop — PRD §8 item 2, mobile project.
 *
 * Referrer is seeded through the API; everything the student does is driven
 * through the UI. The P0 half (referral → registration → pending referral) runs
 * as soon as WS1–WS4 are usable; the P1 half (live check-in → qualified →
 * leaderboard) skips with a WS6 reason until the Durable Object lands.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  BASE_URL,
  WORKSHOP_ID,
  apiContextForToken,
  assertAppRendered,
  blockedReason,
  endpointGaps,
  fakeClientIp,
  registerViaApi,
  uniqueEmail,
  uniquePhone,
} from "./helpers";
import { landing, launchpad, live } from "./selectors";

test.describe.serial("core loop (PRD §8 item 2)", () => {
  let referrerToken = "";
  let referrerFirstName = "";
  let referrerRefCode = "";
  let refereeName = "";
  let refereeToken = "";

  test("referral link → project preview → registration → pending referral (WS1, WS2, WS3, WS4)", async ({
    page,
    request,
  }) => {
    const gaps = await endpointGaps(request, [
      { module: "WS1 POST /api/register", method: "POST", path: "/api/register", data: {}, ok: [400, 409, 429] },
      { module: "WS1 GET /api/me", path: "/api/me", ok: [401] },
      { module: "WS2 POST /api/ideas/preview", method: "POST", path: "/api/ideas/preview", data: {}, ok: [400, 429] },
    ]);
    test.skip(gaps.length > 0, blockedReason(gaps));

    // Seed the referrer through the API, as a distinct simulated client.
    const referrer = await registerViaApi({ name: "Ravi E2E", clientIp: fakeClientIp() });
    referrerToken = referrer.data.token;
    referrerFirstName = referrer.data.name.split(" ")[0];
    referrerRefCode = referrer.data.refCode;
    await referrer.context.dispose();

    // WS1 referral landing: real HTML with OG tags, then a client-side redirect.
    const referralHtml = await request.get(`/r/${referrerRefCode}`, { failOnStatusCode: false });
    expect(referralHtml.status(), "WS1 /r/:code must return HTML for a valid code").toBe(200);
    expect(await referralHtml.text(), "WS1 /r/:code must include og:image").toContain("og:image");

    await page.setExtraHTTPHeaders({ "cf-connecting-ip": fakeClientIp() });
    await page.goto(`/r/${referrerRefCode}`).catch(() => undefined);
    await page.waitForURL(/ref=/, { timeout: 15_000 });
    await assertAppRendered(page, "WS3 landing (referred)");

    const refCookie = (await page.context().cookies()).find((cookie) => cookie.name === "s60_ref");
    expect(refCookie?.value, "WS1 /r/:code must set the s60_ref attribution cookie").toBe(referrerRefCode);

    // WS3 project preview: pick branch + interest, the card is written from the API.
    const landingPage = landing(page);
    await landingPage.branchChip("CSE/IT/AI-ML").click();
    await landingPage.interestChip("placements").click();
    await expect(landingPage.projectCard, "WS3 landing: project preview card").toBeVisible();
    await expect(landingPage.showAnother, "WS3 landing: 'Show me another' control").toBeVisible();

    // WS3 registration form; attribution rides on the s60_ref cookie set above.
    refereeName = `Zara${Date.now().toString(36).slice(-5)}`;
    await landingPage.name.fill(refereeName);
    await landingPage.email.fill(uniqueEmail("e2e.referee"));
    await landingPage.phone.fill(uniquePhone());
    await landingPage.branch.selectOption({ label: "CSE/IT/AI-ML" });
    // Local D1 may be unseeded, so use the always-present "Other: type it" path.
    await landingPage.college.click();
    await landingPage.college.fill("Other");
    await landingPage.collegeOtherOption.click();
    await landingPage.collegeOther.fill("E2E Test College");
    await landingPage.consent.check();
    await landingPage.submit.click();

    await page.waitForURL(/\/me/, { timeout: 20_000 });

    // WS4 Launchpad: ticket, copy link.
    const pad = launchpad(page);
    await expect(pad.seat, "WS4 Launchpad: seat number ticket").toBeVisible();
    await expect(pad.copyLink, "WS4 Launchpad: copy link button").toBeVisible();

    refereeToken = (await page.context().cookies()).find((cookie) => cookie.name === "s60_token")?.value ?? "";

    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE_URL });
    await pad.copyLink.click();
    const clipboard = await page.evaluate<string>("navigator.clipboard.readText().catch(() => '')");
    expect(clipboard, "WS4 Launchpad: copy link must put a /r/ referral link on the clipboard").toContain("/r/");

    // WS4 referrer view: the new referral shows as pending (WS1 attribution).
    const referrerContext = await page.context().browser()!.newContext();
    const referrerPage = await referrerContext.newPage();
    await referrerPage.goto(`/me?t=${encodeURIComponent(referrerToken)}`);
    await expect(
      referrerPage.getByText(refereeName, { exact: false }).first(),
      "WS4 Launchpad: referrer must see the new referral by first name",
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      referrerPage.getByText(/pending/i).first(),
      "WS4 Launchpad: the new referral must show as pending",
    ).toBeVisible();
    await referrerContext.close();
  });

  test("check-in at /live qualifies the referral and updates the leaderboard (WS6, WS1)", async ({
    browser,
    request,
  }) => {
    test.skip(
      refereeToken === "",
      "BLOCKED — the setup test was skipped (no referee token), so there is nothing to check in",
    );
    const gaps = await endpointGaps(request, [
      {
        module: "WS6 GET /api/live/:workshopId/ws",
        path: `/api/live/${WORKSHOP_ID}/ws`,
        ok: [400, 401, 403, 426],
      },
    ]);
    test.skip(gaps.length > 0, blockedReason(gaps));
    expect(refereeToken, "core loop test 1 must have registered the referee first").not.toBe("");

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await context.setExtraHTTPHeaders({ "cf-connecting-ip": fakeClientIp() });
    await context.addCookies([{ name: "s60_token", value: refereeToken, url: BASE_URL }]);
    const page = await context.newPage();
    await page.goto("/live");
    await assertAppRendered(page, "WS6 /live");

    const livePage = live(page);
    await expect(livePage.checkIn, "WS6 /live: check-in control").toBeVisible({ timeout: 20_000 });
    await livePage.checkIn.click();
    await expect(livePage.checkedIn, "WS6 /live: checked-in state").toBeVisible({ timeout: 20_000 });

    // WS6 calls WS1's qualification hook on check-in (PRD M8 → M2).
    const referrerApi: APIRequestContext = await apiContextForToken(referrerToken, fakeClientIp());
    try {
      await expect
        .poll(
          async () => {
            const response = await referrerApi.get("/api/me", { failOnStatusCode: false });
            if (response.status() !== 200) return `GET /api/me → ${response.status()}`;
            const body = (await response.json()) as { referrals?: Array<{ status?: string }> };
            return body.referrals?.[0]?.status ?? "no referral";
          },
          {
            message: "WS6+WS1: check-in must flip the pending referral to qualified",
            timeout: 20_000,
          },
        )
        .toBe("qualified");
    } finally {
      await referrerApi.dispose();
    }

    // WS1 leaderboard reflects the qualified referral.
    const leaderboard = await request.get("/api/leaderboard?type=students", { failOnStatusCode: false });
    expect(leaderboard.status(), "WS1 GET /api/leaderboard").toBe(200);
    const body = (await leaderboard.json()) as {
      students?: Array<{ displayName: string; qualified: number }>;
    };
    const row = (body.students ?? []).find((entry) =>
      entry.displayName.toLowerCase().includes(referrerFirstName.toLowerCase()),
    );
    expect(row, `WS1 leaderboard must include ${referrerFirstName} after a qualified referral`).toBeTruthy();
    expect(row?.qualified ?? 0, "WS1 leaderboard qualified count").toBeGreaterThanOrEqual(1);

    await context.close();
  });
});
