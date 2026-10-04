# DECISIONS.md — decision log

Format per entry: **Context → Options considered → Choice → Why → Rejected.**
Subagents append under their workstream heading. This file feeds the submission's
"what did AI suggest that you rejected" answer, so record real alternatives.

## Phase 0 — orchestrator

### P0.1 Scaffold and toolchain
- **Context:** PRD §6.1 asks for React + Vite + Hono on Workers Static Assets with TypeScript strict.
- **Options:** (a) C3 React template, (b) manual Vite + Cloudflare plugin setup, (c) Next.js on Workers.
- **Choice:** C3 `--framework=react --platform=workers --variant=react-ts`, then restructured `worker/` → `src/worker/` to match PRD §6.2.
- **Why:** Official template pins current compatible versions (Vite 8, `@cloudflare/vite-plugin` 1.62, Wrangler 4.147, TS 6).
- **Rejected:** Next.js — heavier than needed for an SPA + API and the PRD names React Router.

### P0.2 Vitest integration (platform fact verified, differs from PRD §6.1)
- **Context:** PRD names `@cloudflare/vitest-pool-workers`; the current docs (Aug 2026) describe `@cloudflare/vitest-plugin` with the `cloudflareTest()` Vite plugin, and the old package's peer range lags Vitest 5.
- **Options:** (a) old pool package + `defineWorkersConfig`, (b) new `@cloudflare/vitest-plugin` 1.3.6.
- **Choice:** new plugin, `remoteBindings: false`, `wrangler.configPath`, `readD1Migrations` + `applyD1Migrations` in `tests/setup.ts`.
- **Why:** Current supported path; fully local; same `cloudflare:test` APIs.
- **Rejected:** `@cloudflare/vitest-pool-workers` — would pin Vitest 4 while the template ships Vitest 4.1; the new plugin is the documented successor.

### P0.3 Linter
- **Context:** C3 template ships `oxlint`; MASTER_PROMPT Phase 0 says ESLint + Prettier.
- **Options:** (a) keep oxlint, (b) ESLint 10 + typescript-eslint 8 + Prettier.
- **Choice:** ESLint flat config + Prettier, removed oxlint.
- **Why:** Follows the plan; typescript-eslint 8.71 supports ESLint 10 and TS 6.
- **Rejected:** Running both linters — duplicate tooling for no benefit.

### P0.4 Durable Object migrations
- **Context:** Current Wrangler docs say the declarative `exports` field is preferred for new Workers; legacy `migrations` still supported.
- **Choice:** legacy `migrations` with `new_sqlite_classes: ["LiveRoom"]` exactly as PRD §6.3 specifies.
- **Why:** Matches the PRD and every current DO example; no functional difference for one class.
- **Rejected:** `exports` field — would diverge from the PRD for no gain.

### P0.5 Workers AI model ids (platform fact verified)
- **Context:** PRD §6.6 suggests `@cf/meta/llama-3.1-8b-instruct` and `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, "verify against the current model catalog".
- **Choice:** `@cf/meta/llama-3.1-8b-instruct-fast` for ideas/brief and `@cf/meta/llama-3.3-70b-instruct-fp8-fast` for the evaluator (both confirmed in the Oct 2026 catalog).
- **Why:** The `-fast` variant lowers idea latency; 4 s timeout budget matters on mobile.
- **Rejected:** Larger Llama 4 models — more neurons per call with no measured quality need for a 3-field JSON card.

### P0.6 Extra D1 indexes (beyond PRD §6.4)
- `idx_colleges_name` — typeahead `LIKE` scan.
- `idx_events_created` — pacing/funnel queries filter by day, not type.
- `idx_users_flag_status` — admin flags queue.
- `idx_checkins_workshop` — attendance counts per workshop.
- `idx_submissions_user` — launchpad submission lookup.
- **Why:** Each backs a query the PRD's UI performs; all are cheap on D1.

### P0.7 Workshop schedule
- **Context:** PRD says Day 7, Sunday 7:00 PM; build date is 2026-10-04.
- **Choice:** `WORKSHOP_ID=ship60-2026-10-11`, `WORKSHOP_START_ISO=2026-10-11T13:30:00.000Z` (19:00 IST).
- **Rejected:** Leaving the date empty — the countdown, `.ics` and pacing chart all need it.

### P0.8 Static idea bank size
- **Context:** MASTER_PROMPT Phase 0 asks for ≥ 48 ideas, "6 branches × 8 interests, one each minimum".
- **Choice:** exactly one hand-written idea per branch × interest (48), served when AI fails.
- **Why:** Covers every combination with a verified buildable idea; the AI path supplies variant diversity (3 per combo).
- **Rejected:** 144 static ideas — triples content volume for a fallback path that should rarely trigger.

### P0.9 Same-origin API only
- **Context:** SPA and API share one Worker.
- **Choice:** no CORS layer; cookies are SameSite=Lax, HttpOnly, Secure.
- **Why:** No third-party origins need API access; CORS would only widen the attack surface.

## WS1

_(pending)_

## WS2

_(pending)_

## WS3

_(pending)_

## WS4

_(pending)_

## WS5

_(pending)_

## WS6

_(pending)_

## WS7

_(pending)_

## WS8

_(pending)_

## WS9

_(pending)_
