/**
 * WS9 selector map. Primary locators are data-testids (requested from the UI
 * workstreams in TASKS.md); PRD §4/§5 copy is the fallback so the suite can run
 * against the built UI even before the testids land. Update here — not in the
 * specs — when a copy hook moves.
 */
import type { Locator, Page } from "@playwright/test";

function first(...locators: Locator[]): Locator {
  return locators.reduce((combined, locator) => combined.or(locator)).first();
}

export function landing(page: Page) {
  return {
    branchChip: (name: string) =>
      first(page.getByTestId(`branch-${name}`), page.getByRole("button", { name, exact: true })),
    interestChip: (name: string) =>
      first(page.getByTestId(`interest-${name}`), page.getByRole("button", { name, exact: true })),
    showAnother: first(
      page.getByTestId("idea-another"),
      page.getByRole("button", { name: /show me another/i }),
    ),
    projectCard: first(
      page.getByTestId("project-card"),
      page.locator("[aria-label^='Project preview']"),
    ),
    name: first(
      page.getByTestId("register-name"),
      page.getByLabel(/^(your |full )?name\b/i),
    ),
    email: first(page.getByTestId("register-email"), page.getByLabel(/email/i)),
    phone: first(
      page.getByTestId("register-phone"),
      page.getByLabel(/whatsapp|phone|mobile/i),
    ),
    college: first(page.getByTestId("register-college"), page.getByLabel(/^college\b/i)),
    collegeOther: first(
      page.getByTestId("register-college-other"),
      page.getByLabel(/your college name/i),
    ),
    collegeOtherOption: page.getByRole("option", { name: /other: type it/i }),
    branch: first(page.getByTestId("register-branch"), page.getByLabel(/^branch\b/i)),
    consent: first(
      page.getByTestId("register-consent"),
      page.getByLabel(/consent|agree/i),
    ),
    submit: first(
      page.getByTestId("register-submit"),
      page.getByRole("button", { name: /save my seat|register|join/i }),
    ),
    stub: page.getByText(/will replace this stub/i),
  };
}

export function launchpad(page: Page) {
  return {
    seat: first(page.getByTestId("seat-ticket"), page.getByText(/seat\s*#?\s*\d+/i)),
    copyLink: first(
      page.getByTestId("copy-link"),
      page.getByRole("button", { name: /copy( my)? link/i }),
    ),
    referrals: first(
      page.getByTestId("referral-list"),
      page.getByText(/your referrals/i),
    ),
    stub: page.getByText(/will replace this stub/i),
  };
}

export function live(page: Page) {
  return {
    checkIn: first(
      page.getByTestId("checkin"),
      page.getByRole("button", { name: /check.?in/i }),
    ),
    checkedIn: first(
      page.getByTestId("checked-in"),
      page.getByText(/checked in|you.?re in/i),
    ),
    stub: page.getByText(/will replace this stub/i),
  };
}

export function admin(page: Page) {
  return {
    password: first(
      page.getByTestId("admin-password"),
      page.getByLabel(/password/i),
    ),
    login: first(
      page.getByTestId("admin-login"),
      page.getByRole("button", { name: /log ?in|sign ?in|enter/i }),
    ),
    headline: first(
      page.getByTestId("admin-overview"),
      page.getByText(/registrations/i),
    ),
    chart: first(
      page.getByTestId("pacing-chart"),
      page.locator(".recharts-surface"),
    ),
    flags: first(page.getByTestId("flags-queue"), page.getByText(/flags/i)),
    stub: page.getByText(/will replace this stub/i),
  };
}

export function plan(page: Page) {
  return {
    slides: page.getByTestId("plan-slide"),
    slidesFallback: page.locator("[data-testid='plan-slide'], [data-slide], .plan-slide"),
    stub: page.getByText(/will replace this stub/i),
  };
}
