import { defineConfig } from "@playwright/test";

const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Local e2e needs two things that a clean checkout does not have:
 * 1. `.dev.vars` with test-only ADMIN_PASSWORD / SESSION_SECRET (values match
 *    `tests/worker` expectations; never real credentials). Created on demand,
 *    gitignored, existing values are never overwritten.
 * 2. `CLOUDFLARE_VITE_FORCE_LOCAL=true` so the Workers AI binding stays
 *    simulated — without it `vite dev` tries to reach Cloudflare and fails with
 *    "non-interactive environment" when Playwright starts it.
 * AI-dependent routes degrade to the static idea bank, which is what the
 * contracts promise (PRD §6.6).
 */
const ensureDevVars = [
  `node -e 'const fs=require("fs");`,
  `let s="";try{s=fs.readFileSync(".dev.vars","utf8")}catch{};`,
  `let a="";`,
  `if(!/^ADMIN_PASSWORD=/m.test(s))a+="ADMIN_PASSWORD=test-admin-password\\n";`,
  `if(!/^SESSION_SECRET=/m.test(s))a+="SESSION_SECRET=test-session-secret\\n";`,
  `if(!/^ENVIRONMENT=/m.test(s))a+="ENVIRONMENT=development\\n";`,
  `if(a)fs.appendFileSync(".dev.vars",a)'`,
].join("");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
      testIgnore: [/admin\.spec\.ts/],
    },
    {
      name: "desktop",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
      testIgnore: [/core-loop\.spec\.ts/, /mobile\.spec\.ts/],
    },
  ],
  webServer: {
    command: `${ensureDevVars} && npm run db:migrate:local && npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...(process.env as Record<string, string>),
      CLOUDFLARE_VITE_FORCE_LOCAL: "true",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});
