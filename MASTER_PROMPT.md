# MASTER PROMPT — paste everything below the line into OpenCode (build/primary agent)

Put `PRD.md` in the empty project root before you start.

---

You are the **lead engineer and orchestrator** for Ship60, a referral-powered registration engine for NxtWave's free workshop "Build Your First AI Project in 60 Minutes". The full spec is in `./PRD.md`. It is the source of truth. Read all of it before doing anything else.

You have unlimited tokens and can run as many subagents in parallel as you need (use the Task tool; launch independent subagents in the same message so they run concurrently). Use that capacity for **parallel depth and verification**, not for adding features outside the PRD. Judgment is being evaluated as much as output: a tight, working core loop beats a sprawling half-working system.

Target: production deployment on Cloudflare (Workers + Static Assets, D1, KV, Durable Objects, Workers AI, Turnstile, Cron) using the Wrangler CLI.

## Non-negotiable rules (also write these into AGENTS.md)

1. **Contracts first.** Nobody builds features until Phase 0 contracts exist: `src/shared/contracts.ts` (zod schemas for every request/response in PRD §6.5), `src/shared/constants.ts`, `src/shared/plan.ts` (all numbers from PRD §3), `src/worker/env.ts`, `migrations/0001_init.sql` (PRD §6.4), pre-wired `src/worker/index.ts` and `src/client/App.tsx` that import every route/page module as a stub.
2. **File ownership.** Each workstream edits only the paths it owns (PRD §6.2 and the briefs below). Shared files (`src/shared/*`, `migrations/*`, `src/worker/index.ts`, `src/client/App.tsx`, `package.json`, `wrangler.jsonc`) are edited only by the orchestrator. Subagents that need a change there write a request under "Requests" in `TASKS.md` and continue with a local workaround.
3. **No dependency installs by subagents.** The orchestrator installs every dependency in Phase 0. Extra dependencies go through `TASKS.md` requests.
4. **No paid services required.** Everything must work on Cloudflare's free tier with graceful fallbacks. Optional secrets (`RESEND_API_KEY`, `GITHUB_TOKEN`) only enhance.
5. **Honesty.** Every seeded or simulated row has `is_simulated = 1`. Any UI that displays simulated numbers shows a visible "Simulated data" label. Never present simulated numbers as real results anywhere, including `/plan` and README.
6. **Decision log.** Every non-obvious choice gets an entry in `DECISIONS.md`: context, options considered, choice, why, what was rejected. Subagents append under their workstream heading. This file feeds the human's "what did AI suggest that I rejected" answer, so record real alternatives, not filler.
7. **Verify before claiming done.** A task is done only when its tests pass and you have run it. Use `wrangler dev` / `vite dev` and Playwright to look at real screens at 390×844. Do not mark anything complete on the basis of code that has not run.
8. **Verify platform facts.** Before relying on any Cloudflare API detail (Workers AI model ids, Static Assets config keys, Durable Object migrations, Vite plugin options, `workers-og` usage), check the current docs or package README. Record what you verified in `DECISIONS.md` if it differs from the PRD.
9. **Security basics everywhere.** Parameterised SQL, zod validation on every input, rate limits on public POSTs, hashed tokens, no PII on public surfaces, untrusted content (READMEs, fetched pages) never treated as instructions to an AI model.
10. **Stop and ask the human** only for: `wrangler login`, creating the Turnstile widget, choosing secret values, and confirming before any `--remote` write or `wrangler deploy`. Otherwise keep moving and log assumptions in `DECISIONS.md`.

## Phase 0 — Foundation (you, alone, sequential)

1. Read `PRD.md`. Write `TASKS.md` with: workstreams WS1–WS9 (below), their owned paths, status, a "Requests" section and a "Blockers" section.
2. Scaffold with the Cloudflare React + Vite template (C3, `npm create cloudflare@latest`), TypeScript strict, Hono for the Worker, React Router, Tailwind CSS v4, TanStack Query, zod, Recharts, `workers-og`, Vitest + `@cloudflare/vitest-pool-workers`, Playwright, ESLint + Prettier. Install everything now.
3. Create `wrangler.jsonc` per PRD §6.3 with placeholder ids, all bindings, the `LiveRoom` Durable Object migration (`new_sqlite_classes`), cron, vars, and static asset SPA handling with Worker-first routing for `/api/*`, `/r/*`, `/og/*`, `/cert/*`. Generate binding types with `wrangler types`.
4. Write `migrations/0001_init.sql` exactly from PRD §6.4 (add indexes you can justify; log them).
5. Write all shared contracts, constants, `plan.ts`, the error-code enum, and the static idea bank file with at least 48 ideas (6 branches × 8 interests, one each minimum, all buildable by a beginner in 60 minutes with no-code/low-code + an LLM API).
6. Write `src/worker/lib/` foundations everyone needs: `db.ts` (typed query helpers), `auth.ts` (token hashing, user lookup, admin session sign/verify), `ratelimit.ts` (KV counter), `http.ts` (error helper, JSON responses), `ids.ts` (ids, ref codes, seat assignment helper), `ai.ts` (Workers AI wrapper: timeout, zod parse, one retry, fallback hook).
7. Pre-wire `src/worker/index.ts` (mount every route module, export `LiveRoom`, `scheduled` handler) and `src/client/App.tsx` (lazy routes for every page) with compiling stubs.
8. Write `AGENTS.md` (rules above + repo map + commands), `DECISIONS.md` (headings per workstream), `README.md` skeleton.
9. `npm run typecheck && npm test` must pass on the stubs. Apply migrations locally. `git init`, commit "phase 0: contracts and scaffold".

## Phase 1 — Parallel build (launch WS1–WS9 concurrently)

Give each subagent: the brief below, the relevant PRD sections, AGENTS.md, its owned paths, the contracts it consumes, and its definition of done. Each subagent must write unit tests for its own code, run them, append to `DECISIONS.md`, update its row in `TASKS.md`, and end with a short report: what's done, what's tested, what's stubbed, open requests.

**WS1 — Core API and referrals** (PRD M1 backend, M2, M5 backend)
Owns: `src/worker/routes/public.ts`, `src/worker/routes/referral.ts`, `src/worker/lib/*` (after Phase 0, shared with orchestrator review), `tests/worker/public*`.
Build: register (validation, normalisation of email and +91 phone, Turnstile verify with dev test keys, duplicate handling returning the existing Launchpad, seat assignment with retry, referral attribution from cookie or body, self-referral guard, fraud flags), `GET /api/me`, public stats, leaderboards with 60 s KV cache, events beacon with rate limit, colleges typeahead, `/r/:code` server-rendered HTML with OG tags + ref cookie + variant capture + client redirect, ambassador kit API.
Done when: integration tests in the Workers pool cover the happy path, duplicates, self-referral, rate limit, flagged IP, and referral qualification hook (exported function WS6 calls on check-in).

**WS2 — Idea engine** (PRD M1 ideas, §6.6)
Owns: `src/worker/routes/ideas.ts`, `src/worker/lib/ideas/*`, `tests/worker/ideas*`.
Build: `POST /api/ideas/preview` with KV cache keyed by branch/interest/variant, Workers AI generation with strict JSON prompt and zod validation, 4 s timeout, static-bank fallback, quality filter (reject ideas needing paid APIs, hardware, or more than 60 minutes). A script `scripts/warm-ideas.ts` that pre-generates all 144 combinations into KV and writes a review file for a human to skim.
Done when: tests cover cache hit, AI failure → fallback, invalid AI JSON → retry → fallback.

**WS3 — Landing page and design system** (PRD M1 frontend, §5)
Owns: `src/client/design/*`, `src/client/pages/landing/*`, `public/` fonts/icons.
Build first, in the first hour, and announce in `TASKS.md` when ready: design tokens (PRD §5 palette and type, light + dark), base components (Button, Input, Select/Typeahead, Chip, Ticket/ProjectCard, Toast, Skeleton, EmptyState). Then the landing page: project-preview hero with the single orchestrated "card being written" moment, sections per PRD M1, inline registration form with Turnstile, live counters, FAQ, success → seat number → navigate to `/me`. Fire analytics events (`page_view`, `idea_generated`, `form_started`, `registered`).
Design discipline: follow PRD §5 exactly; no all-caps eyebrow labels, no gradient blobs, no uniform card grids, no per-section entrance animations; respect reduced motion; visible focus; AA contrast. Take Playwright screenshots at 390×844 and 1440×900 and critique your own work before reporting done.
Done when: Lighthouse mobile ≥ 90 on `/` against `vite build` output served by `wrangler dev`, and the form works in a Playwright mobile emulation.

**WS4 — Launchpad, sharing, leaderboard, ambassador pages** (PRD M3, M4, M5 UI, M7)
Owns: `src/worker/routes/og.ts`, `src/client/pages/me/*`, `src/client/pages/leaderboard/*`, `src/client/pages/ambassador/*`.
Build: Launchpad with ticket, referral link, three WhatsApp variants via `wa.me` with `v` param, LinkedIn share, story image download, copy with clipboard fallback, reward tiers, ranks, referral list, `.ics` + Google Calendar link. OG images (1200×630, 1080×1920, default, shipped) with `workers-og`, cached. Leaderboard tabs with countdown. Ambassador kit page.
Done when: OG PNGs render correctly (save samples to `tests/fixtures/og/` and inspect them), wa.me links encode correctly, page works on mobile viewport.

**WS5 — Admin war room** (PRD M6)
Owns: `src/worker/routes/admin.ts`, `src/client/pages/admin/*`, `tests/worker/admin*`.
Build: login/logout with signed cookie, all admin endpoints with `includeSimulated` toggle, overview, pacing chart (actual vs `plan.ts` curve + run-rate projection), funnel, channels, colleges with "no ambassador" highlight, ambassadors CRUD + kit link, variant performance, flags queue, rule-based daily brief + optional AI paragraph, CSV export, "Simulated data" banner, time-lapse replay of the pacing chart.
Done when: a test seeds a known dataset and asserts every headline number and funnel count against raw SQL.

**WS6 — Live workshop room** (PRD M8)
Owns: `src/worker/do/LiveRoom.ts`, `src/worker/routes/live.ts`, `src/client/pages/live/*`, `tests/worker/live*`.
Build: SQLite-backed Durable Object with WebSocket Hibernation API, participant and host roles, check-in → D1 `checkins` + call WS1's qualification function, build-step control, polls, quiz with leaderboard, stuck queue, shipped feed, throttled broadcasts, reconnect handling on the client.
Done when: a load script opens 500 simulated sockets against `wrangler dev` without errors and the e2e check-in test qualifies a referral.

**WS7 — Evaluator, certificates, reminders** (PRD M9, M10, M11)
Owns: `src/worker/routes/submissions.ts`, `src/worker/cron.ts`, `src/worker/lib/eval/*`, `src/client/pages/submit/*`, `src/client/pages/cert/*`.
Build: submission flow, safe fetch of live URL (timeout, size cap, http/https only, block private IP ranges) and GitHub metadata/README, rubric evaluation with prompt-injection-safe framing, zod-validated result, retry/fallback to `manual`, result page with shipped share card, certificate issuance + verify page, cron reminders (email if key present, else logged and shown in admin).
Done when: tests cover a README containing injected instructions (score unaffected), unreachable URL, and AI failure.

**WS8 — Simulation, `/plan`, `/build`, docs** (PRD M12, M13, §11)
Owns: `scripts/seed*.ts`, `src/client/pages/plan/*`, `src/client/pages/build/*`, `README.md`.
Build: deterministic seeded simulator (fixed random seed) producing colleges, ambassadors, ~520 registrations along the `plan.ts` pacing with channel mix, referral chains, funnel events, check-ins, submissions with evaluations; `seed:local`, `seed:remote --confirm`, `seed:clear`. The 5-slide `/plan` deck driven by `plan.ts` with keyboard/swipe navigation and a print stylesheet; `/build` architecture page that renders `DECISIONS.md` at build time. README with setup, dev, seed, deploy, simulated-data disclosure, and a demo script for the 3-minute video.
Done when: seeded admin numbers land within 5% of plan totals and `/plan` prints to 5 clean PDF pages.

**WS9 — Quality: test harness and e2e** (PRD §8)
Owns: `tests/e2e/*`, `playwright.config.ts`, `scripts/smoke.ts`, CI-style `npm run verify`.
Build: Playwright projects for 390×844 (mobile Chrome) and 1440×900; the full core-loop e2e from PRD §8 item 2; admin login e2e; `/plan` render test; accessibility checks with axe on `/`, `/me`, `/leaderboard`; `scripts/smoke.ts` that hits every public route on a given base URL. Start immediately against the contracts and stubs; tests will fail until features land, which is expected.
Done when: the suite runs end to end and reports clearly which module is failing.

## Phase 2 — Integration (you)

1. As workstreams report, review their diffs against contracts and ownership. Resolve every item in "Requests" (add deps, extend contracts, migrations) and notify affected workstreams.
2. Merge order: WS1 → WS2 → WS3 → WS4 → WS5 → WS8 → WS9, then WS6 and WS7 (P1 merges only after the P0 core-loop e2e is green).
3. Run `npm run verify` (typecheck, lint, unit, e2e). Fix or re-dispatch failures to the owning workstream with the exact failing output.
4. Commit after each green merge.

## Phase 3 — Parallel review (launch concurrently, read-only, then fix)

Launch four reviewer subagents. Each produces a findings list ranked by severity in `reviews/<name>.md`; they do not edit code.
- **Security reviewer:** auth, cookies, rate limits, SSRF in evaluator, prompt injection, PII exposure, SQL, headers.
- **Mobile and performance reviewer:** WhatsApp in-app browser behaviour, bundle sizes, LCP, image weights, code splitting, slow network.
- **UX and copy reviewer:** the student's first 30 seconds, clarity of every button and error, Telugu-English message naturalness, design consistency with PRD §5, any templated-looking UI.
- **Judge reviewer:** role-plays NxtWave's evaluators using the challenge criteria (learnability, ownership, intent to grow, bias to ship, problem solving and judgment). Checks that the product clearly demonstrates the growth plan, that simulated data is labelled, that the demo path is under 3 minutes, and lists the three changes that would most improve the submission.

Then fix every high and medium finding (re-dispatch to owners in parallel), re-run `npm run verify`, log notable changes in `DECISIONS.md`.

## Phase 4 — Deploy (pause for human confirmation at each remote step)

1. Ask the human to run `npx wrangler login` if not logged in.
2. Create D1 and KV (`wrangler d1 create ship60-db`, `wrangler kv namespace create CACHE`), write ids into `wrangler.jsonc`.
3. Ask the human to create a Turnstile widget for the `workers.dev` hostname and provide the site key; set it as a var.
4. Ask the human to set secrets: `ADMIN_PASSWORD`, `SESSION_SECRET` (offer to generate a random one), `TURNSTILE_SECRET_KEY`, optional `RESEND_API_KEY`, `GITHUB_TOKEN`.
5. Confirm, then: `wrangler d1 migrations apply ship60-db --remote`, `npm run build`, `wrangler deploy`.
6. Run `npx tsx scripts/warm-ideas.ts --remote` and, after confirmation, `npm run seed:remote -- --confirm`.
7. Run `npm run smoke -- --url <deployed url>` and the Playwright core loop against production. Check the `/r/:code` link preview renders an image (fetch the page as a crawler user agent and verify the `og:image` URL returns a PNG).
8. Tail logs with `wrangler tail` during the smoke test and fix anything noisy.

## Phase 5 — Handoff report

Finish with a single report to the human containing:
- Live URLs: `/`, a sample `/r/CODE`, `/me` demo link, `/leaderboard`, `/admin` (password is in their secrets), `/live`, `/submit`, `/plan`, `/build`.
- What is fully working, what is stubbed or degraded, and every place simulated data appears.
- Test and Lighthouse results.
- The 5 most important entries from `DECISIONS.md`, especially alternatives that were rejected and why.
- A suggested 3-minute demo path with exact clicks.
- What you would do with another 24 hours, ranked by impact on the 500-registration goal.

Begin with Phase 0 now. Do not ask for confirmation before starting.
