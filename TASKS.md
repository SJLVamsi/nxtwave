# TASKS.md — workstream board

Status: `todo` | `in-progress` | `blocked` | `done`. Update your row and append to
Requests/Blockers. Orchestrator owns this file's structure.

## Workstreams

| WS | Scope | Owned paths | Status | Notes |
|----|-------|-------------|--------|-------|
| WS1 | Core API + referrals (M1 backend, M2, M5 backend) | `src/worker/routes/public.ts`, `referral.ts`, `src/worker/lib/*`, `tests/worker/public*` | todo | Critical path; exports the referral qualification function WS6 calls |
| WS2 | Idea engine (M1 ideas, §6.6) | `src/worker/routes/ideas.ts`, `src/worker/lib/ideas/*`, `tests/worker/ideas*`, `scripts/warm-ideas.ts` | todo | Consumes `IDEA_BANK` + `runAiJson` |
| WS3 | Landing page + design system (M1 frontend, §5) | `src/client/design/*`, `src/client/pages/landing/*`, `public/` fonts/icons | todo | Build tokens + base components first and announce ready here |
| WS4 | Launchpad, sharing, leaderboard, ambassador (M3, M4, M5 UI, M7) | `src/worker/routes/og.ts`, `src/client/pages/me/*`, `leaderboard/*`, `ambassador/*` | todo | Needs WS1 API + WS3 design components |
| WS5 | Admin war room (M6) | `src/worker/routes/admin.ts`, `src/client/pages/admin/*`, `tests/worker/admin*` | todo | Pacing from `plan.ts`; `includeSimulated` toggle everywhere |
| WS6 | Live workshop room (M8) | `src/worker/do/LiveRoom.ts`, `src/worker/routes/live.ts`, `src/client/pages/live/*`, `tests/worker/live*` | todo | P1; calls WS1 qualification on check-in |
| WS7 | Evaluator, certificates, reminders (M9–M11) | `src/worker/routes/submissions.ts`, `src/worker/cron.ts`, `src/worker/lib/eval/*`, `src/client/pages/submit/*`, `cert/*` | todo | P1/P2; prompt-injection-safe framing required |
| WS8 | Simulation, /plan, /build, docs (M12, M13, §11) | `scripts/seed*.ts`, `src/client/pages/plan/*`, `build/*`, `README.md` | todo | Deterministic seed; numbers from `plan.ts` |
| WS9 | Test harness + e2e (§8) | `tests/e2e/*`, `playwright.config.ts`, `scripts/smoke.ts` | todo | Start against contracts/stubs; failures expected until features land |

## Requests

_(Subagents: add requests for shared-file changes here — dependency, contract,
migration, index.ts mount — then continue with a local workaround.)_

## Blockers

_(Anything that stops progress; the orchestrator resolves or re-dispatches.)_
