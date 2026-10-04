# AGENTS.md — rules every agent follows

Ship60 is a referral-powered registration engine for NxtWave's free workshop
"Build Your First AI Project in 60 Minutes". `PRD.md` is the source of truth.
`MASTER_PROMPT.md` is the build plan. `TASKS.md` is the live board.

## Non-negotiable rules

1. **Contracts first.** Nobody builds features until Phase 0 contracts exist:
   `src/shared/contracts.ts` (zod schemas for every request/response in PRD §6.5),
   `src/shared/constants.ts`, `src/shared/plan.ts` (all numbers from PRD §3),
   `src/worker/env.ts`, `migrations/0001_init.sql` (PRD §6.4), pre-wired
   `src/worker/index.ts` and `src/client/App.tsx` importing every route/page module.
2. **File ownership.** Each workstream edits only the paths it owns (PRD §6.2 and
   the briefs in `MASTER_PROMPT.md`). Shared files (`src/shared/*`, `migrations/*`,
   `src/worker/index.ts`, `src/client/App.tsx`, `package.json`, `wrangler.jsonc`)
   are edited only by the orchestrator. Subagents that need a change there write a
   request under "Requests" in `TASKS.md` and continue with a local workaround.
3. **No dependency installs by subagents.** The orchestrator installs every
   dependency in Phase 0. Extra dependencies go through `TASKS.md` requests.
4. **No paid services required.** Everything must work on Cloudflare's free tier
   with graceful fallbacks. Optional secrets (`RESEND_API_KEY`, `GITHUB_TOKEN`)
   only enhance.
5. **Honesty.** Every seeded or simulated row has `is_simulated = 1`. Any UI that
   displays simulated numbers shows a visible "Simulated data" label. Never present
   simulated numbers as real results anywhere, including `/plan` and README.
6. **Decision log.** Every non-obvious choice gets an entry in `DECISIONS.md`:
   context, options considered, choice, why, what was rejected. Subagents append
   under their workstream heading. Record real alternatives, not filler.
7. **Verify before claiming done.** A task is done only when its tests pass and it
   has been run. Use `wrangler dev` / `vite dev` and Playwright at 390×844. Do not
   mark anything complete on the basis of code that has not run.
8. **Verify platform facts.** Before relying on any Cloudflare API detail (Workers
   AI model ids, Static Assets config keys, Durable Object migrations, Vite plugin
   options, `workers-og` usage), check the current docs or package README. Record
   what you verified in `DECISIONS.md` if it differs from the PRD.
9. **Security basics everywhere.** Parameterised SQL, zod validation on every
   input, rate limits on public POSTs, hashed tokens, no PII on public surfaces,
   untrusted content (READMEs, fetched pages) never treated as instructions to an
   AI model.
10. **Stop and ask the human** only for: `wrangler login`, creating the Turnstile
    widget, choosing secret values, and confirming before any `--remote` write or
    `wrangler deploy`. Otherwise keep moving and log assumptions in `DECISIONS.md`.
11. **Agent log.** Every dispatched subagent gets a row in the Agent log below (who,
    what, outcome, evidence path, commit) at dispatch time, updated when it reports.
    The orchestrator maintains this table; subagents never edit it.

## Repo map

```
src/shared/          contracts.ts, constants.ts, plan.ts, idea-bank.ts, errors.ts
src/worker/
  index.ts           Hono app, mounts every route module (orchestrator only)
  env.ts             AppEnv bindings type
  cron.ts            scheduled handler (WS7)
  lib/               db, auth, ratelimit, http, ids, ai (WS1 owns, others request)
  routes/            public, ideas, referral, og, admin, live, submissions
  do/LiveRoom.ts     Durable Object (WS6)
src/client/
  App.tsx, main.tsx  router pre-wired (orchestrator only)
  design/            tokens + base components (WS3 owns, others consume)
  pages/             landing, me, leaderboard, ambassador, admin, live, submit,
                     cert, plan, build
migrations/          D1 SQL (orchestrator only)
scripts/             seed, warm-ideas, smoke (WS8/WS9)
tests/worker/        Vitest (Workers pool) unit + integration
tests/e2e/           Playwright
```

## Workstream ownership (PRD §6.2, MASTER_PROMPT.md)

| WS | Owns |
|----|------|
| WS1 | `src/worker/routes/public.ts`, `referral.ts`, `src/worker/lib/*`, `tests/worker/public*` |
| WS2 | `src/worker/routes/ideas.ts`, `src/worker/lib/ideas/*`, `tests/worker/ideas*`, `scripts/warm-ideas.ts` |
| WS3 | `src/client/design/*`, `src/client/pages/landing/*`, `public/` fonts/icons |
| WS4 | `src/worker/routes/og.ts`, `src/client/pages/me/*`, `leaderboard/*`, `ambassador/*` |
| WS5 | `src/worker/routes/admin.ts`, `src/client/pages/admin/*`, `tests/worker/admin*` |
| WS6 | `src/worker/do/LiveRoom.ts`, `src/worker/routes/live.ts`, `src/client/pages/live/*`, `tests/worker/live*` |
| WS7 | `src/worker/routes/submissions.ts`, `src/worker/cron.ts`, `src/worker/lib/eval/*`, `src/client/pages/submit/*`, `cert/*` |
| WS8 | `scripts/seed*.ts`, `src/client/pages/plan/*`, `build/*`, `README.md` |
| WS9 | `tests/e2e/*`, `playwright.config.ts`, `scripts/smoke.ts`, `npm run verify` |

## Commands

```bash
npm run dev              # Vite + Worker dev server
npm run build            # tsc -b && vite build
npm run typecheck        # tsc -b
npm run lint             # eslint .
npm run format           # prettier --write .
npm test                 # vitest run (Workers pool, D1 migrations applied)
npm run e2e              # Playwright (install browsers first: npx playwright install chromium)
npm run verify           # typecheck + lint + test + e2e
npm run db:migrate:local # apply D1 migrations locally
npm run seed:local       # seed simulated data (WS8)
npm run smoke -- --url   # smoke all public routes (WS9)
```

## Environment notes

- Cloudflare Vite plugin serves the SPA + Worker from one dev server; `wrangler.jsonc`
  is the input config, `dist/ship60/wrangler.json` is the build output.
- Vitest uses `@cloudflare/vitest-plugin` (`cloudflareTest()`) with
  `remoteBindings: false` so tests run fully locally. D1 migrations are applied in
  `tests/setup.ts` via `applyD1Migrations`.
- Dev Turnstile keys are in `wrangler.jsonc` (`1x000...`); the site always verifies
  in dev and real verification activates when `TURNSTILE_SECRET_KEY` is set.
- Workers AI models in use (verified against the model catalog, Oct 2026):
  `@cf/meta/llama-3.1-8b-instruct-fast` (ideas/brief),
  `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (evaluator).

## Agent log

Every dispatched subagent gets a row here at dispatch time, updated when it reports
(rule 11). Evidence paths are relative to the repo root. Orchestrator commits are
noted for traceability.

| Date | Agent | Task | Outcome | Evidence | Commit |
|------|-------|------|---------|----------|--------|
| 2026-10-04 | Orchestrator | Phase 0: contracts, scaffold, migration, libs, docs | done | `src/shared/*`, `migrations/0001_init.sql`, `AGENTS.md` | `869f6cd` |
| 2026-10-04 | WS1 implementer | Core API + referrals (register, me, leaderboards, events, colleges, ambassador kit, `/r/:code`) | done — 30 tests | `.superpowers/sdd/MASTER_PROMPT/reports/WS1-report.md` | `afa6b31` |
| 2026-10-04 | WS2 implementer | Idea engine: cache, AI + bank fallback, quality filter, warm script | done — 11 tests | reports/WS2-report.md, `scripts/warm-ideas.ts` | `afa6b31` |
| 2026-10-04 | WS3 implementer | Design tokens + 9 components + landing page | done — Lighthouse 98/100/100/91, screenshots in `reviews/ws3/` | reports/WS3-report.md | `afa6b31` |
| 2026-10-04 | WS4 implementer | OG cards, Launchpad, leaderboard, ambassador pages | done — 9 tests, PNG fixtures inspected | reports/WS4-report.md, `tests/fixtures/og/` | `afa6b31` |
| 2026-10-04 | WS5 implementer | Admin war room API + UI + CSV + brief + time-lapse | done — 27 tests vs raw SQL | reports/WS5-report.md | `afa6b31` |
| 2026-10-04 | WS6 implementer | LiveRoom DO (SQLite + hibernation), live routes/pages | done — 14 tests, 500-socket load 0 errors | reports/WS6-report.md, `tests/worker/live-load.ts` | `afa6b31` |
| 2026-10-04 | WS7 implementer | Evaluator (SSRF, injection-safe), certificates, cron | done — 12 tests | reports/WS7-report.md | `afa6b31` |
| 2026-10-04 | WS8 implementer | Deterministic simulator, `/plan` deck, `/build`, README | done — seed 520, 5-page PDF, determinism check | reports/WS8-report.md | `afa6b31` |
| 2026-10-04 | WS9 implementer | Playwright harness, e2e specs, smoke script | done — 12 e2e green after integration | reports/WS9-report.md, `tests/e2e/` | `afa6b31` |
| 2026-10-04 | Orchestrator | Phase 2 integration: unshadow API mounts, 101 pass-through, KV invalidation, contracts, dev config | done — full verify green | `DECISIONS.md` §I2 | `afa6b31` |
| 2026-10-04 | Security reviewer | Read-only security audit | 1 Critical, 1 High, 6 Medium, 5 Low | `reviews/security.md` | `e8e8926` |
| 2026-10-04 | Mobile/perf reviewer | Read-only mobile + performance audit | 1 High, 1 Medium, 2 Low; LCP 1244 ms, JS 106.9 KB gzip | `reviews/mobile-performance.md` | `e8e8926` |
| 2026-10-04 | UX/copy reviewer | Read-only student-journey + copy audit | 1 Critical, 6 High, 14 Medium, 8 Low | `reviews/ux-copy.md` | `e8e8926` |
| 2026-10-04 | Judge reviewer | Read-only evaluator role-play | 8.1/10; 3 highest-impact changes | `reviews/judge.md` | `e8e8926` |
| 2026-10-04 | GSD SDK | `gsd-sdk init @PRD.md` bootstrap | partial — config written, LLM synthesis failed (no credentials) | `.planning/config.json` | `17a83d0` |
| 2026-10-04 | Orchestrator | GSD planning artifacts + hardening plans + contracts | done | `.planning/PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`, `phases/04-hardening/*` | Phase 4 commit |
| 2026-10-04 | 04-01 implementer | GSD plan 04-01: duplicate takeover, live header forgery, idea key, cron copy | done — 54 tests | `.planning/phases/04-hardening/04-01-SUMMARY.md` | Phase 4 commit |
| 2026-10-04 | 04-02 implementer | GSD plan 04-02: CSV injection, brief injection, DNS SSRF, cert PII, OG keys, admin sim default | done — 122 worker tests | `.planning/phases/04-hardening/04-02-SUMMARY.md` | Phase 4 commit |
| 2026-10-04 | 04-03 implementer | GSD plan 04-03: card scroll, error clearing, story share, `_headers`, preload, contrast, plan/build/cert | done — axe 0 serious, 12 e2e | `.planning/phases/04-hardening/04-03-SUMMARY.md` | Phase 4 commit |

**Maintenance:** append a row the moment a subagent is dispatched (status `running`),
then update outcome/evidence/commit when it reports. Never delete rows; corrections go
in the Outcome cell.

