# Ship60

A referral-powered registration engine for NxtWave's free workshop
**"Build Your First AI Project in 60 Minutes"**. One Cloudflare Worker serves a
React SPA and a Hono API, backed by D1, KV, Durable Objects, Workers AI,
Turnstile and Cron Triggers — all on the free tier.

> **Simulation notice.** This repository is a growth-challenge simulation, not a
> live campaign. No real students are contacted. Every row created by
> `scripts/seed.ts` has `is_simulated = 1`, student names are invented, emails
> use `@example.com` and phones use the reserved `+91 90000xxxxx` pattern. Any
> screen that shows seeded numbers carries a visible **"Simulated data"** label
> (admin war room, `/plan`, `/leaderboard`). Nothing simulated is ever presented
> as a real campaign result.

## What's inside

| Module                                                                 | Where                       |
| ---------------------------------------------------------------------- | --------------------------- |
| Landing page with AI project preview + inline registration (Turnstile) | `/`                         |
| Referral links with server-rendered OG previews, PNG share cards       | `/r/:code`, `/og/:code.png` |
| My Launchpad: seat ticket, referral link, tiers, ranks, calendar       | `/me`                       |
| Student + college leaderboards                                         | `/leaderboard`              |
| Ambassador kit with 3 WhatsApp message variants                        | `/ambassador/:code`         |
| Admin war room: pacing, funnel, channels, flags, daily brief, CSV      | `/admin`                    |
| Live workshop room (Durable Object + WebSockets)                       | `/live`, `/live/host`       |
| AI project evaluator + verifiable certificates                         | `/submit`, `/cert/:id`      |
| 5-slide growth deck (keyboard/swipe, print to PDF)                     | `/plan`                     |
| Architecture + decision log rendered from `DECISIONS.md`               | `/build`                    |

## Quick start

Node 20+. npm.

```bash
npm install
npm run db:migrate:local   # apply migrations/ to the local D1 database
npm run seed:local         # deterministic simulated demo data
npm run dev                # Vite + Worker dev server on http://localhost:5173
```

For admin access in local dev, create `.dev.vars` (git-ignored):

```
ADMIN_PASSWORD=dev-admin
SESSION_SECRET=dev-session-secret
```

The dev Turnstile keys are already in `wrangler.jsonc` and always verify locally.

## Seeding (simulated data)

`scripts/seed.ts` is a deterministic simulator: a fixed mulberry32 PRNG, fixed
campaign dates (Day 1 = Mon 2026-10-05 … Day 7 = Sun 2026-10-11) and no
`Date.now()` anywhere. Two consecutive runs produce identical SQL, totals and a
fingerprint.

```bash
npm run seed:local                      # local D1 (default)
npm run seed:remote -- --confirm        # remote D1; refuses without --confirm
npm run seed:clear                      # deletes simulated rows only, children first
```

What a run creates (all `is_simulated = 1`, from `scripts/seed.ts`):

| Rows                    | Count        | Notes                                                            |
| ----------------------- | ------------ | ---------------------------------------------------------------- |
| Colleges                | 40           | Real names (PRD Appendix A, verified), no simulated flag column  |
| Ambassadors             | 20           | Fake names, real colleges, seats after the students              |
| Student registrations   | 520          | 7 days of `PACING` with noise; channel mix from `plan.ts`        |
| — ambassadors           | 245          | attributed to an ambassador's link                               |
| — referral loop         | 110          | k = 110/410 ≈ 0.27, chains through earlier registrants           |
| — clubs / owned / boost | 80 / 60 / 25 | `utm_source` matches the channel id                              |
| Referrals               | 355          | one per attributed registration; qualified on simulated check-in |
| Check-ins               | ~45%         | 227 on the last run, Day 7 between 18:30–19:15 IST               |
| Submissions             | 120          | evaluated JSON per `EvaluationSchema`, certificates issued       |
| Events                  | ~7,600       | full funnel + `ai_call` for the admin AI usage panel             |
| Flagged users           | 12           | 7 open / 3 approved / 2 rejected, with reasons                   |

The script asserts and prints: total within 5% of `PLANNED_REGISTRATIONS`, each
channel within 5% of PRD §3.2, k-factor ≈ 0.27, check-in rate 40–50%,
~120 submissions, and contact-safe reserved email/phone patterns. It then reads
counts back from D1 and prints the channel mix and pacing tables plus a
fingerprint (last verified run: `ab16cb7a52ea718f`, identical on two runs).

The seed is idempotent: it deletes simulated rows first, so re-running never
duplicates. It never touches real rows; if a real registration already holds a
seat, simulated seats start after it.

## 3-minute demo script (PRD §11)

| Time | Do exactly this                                                                                                                                                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00 | Open `/plan`. Slide 1 (`The student`) → slide 2 (`Insight & channels`). Say the one line: distribution through trust, not traffic.                                                                                                              |
| 0:30 | Press → to slide 3. Point at the channel stack and the k ≈ 0.27 referral loop. Press → to slide 4 for the 7-day pacing curve.                                                                                                                   |
| 1:00 | On a phone (390×844): open `/`. Pick a branch + interest, read the project card, tap **Register**. Fill name/email/WhatsApp, pick a seeded college from the typeahead, tick consent, submit. Note the seat ticket, then land on `/me`.          |
| 1:20 | On `/me`: tap **Copy my link**, then the WhatsApp share variant. Open `/r/<CODE>` in a second tab, register a second student through it. Back on `/me`, show the pending referral and the reward tier progress.                                 |
| 1:35 | As the second student, open `/live`, join and check in. Refresh `/me` of the first student: the referral is now **qualified**. Open `/leaderboard` to show it moved.                                                                            |
| 1:50 | Open `/admin`, sign in. Walk the headline cards, the pacing chart (plan vs simulated actuals), the time-lapse replay button, the funnel, channels, flags queue and the daily brief. Toggle **include simulated** to show real vs seeded counts. |
| 2:30 | Open `/build`. Scroll the architecture diagram, the module table and the decision log (rejected channels, alternatives). Close with what you would do with 24 more hours (from the decision log's rejected options).                            |

Everything shown after seeding is simulated and labelled. In production, the
same screens would show real registrations with the toggle on.

## Commands

```bash
npm run dev              # Vite + Worker dev server
npm run build            # tsc -b && vite build
npm run typecheck        # tsc -b
npm run lint             # eslint .
npm run format           # prettier --write .
npm test                 # Vitest (Workers pool, local D1 + migrations)
npm run e2e              # Playwright (npx playwright install chromium first)
npm run verify           # typecheck + lint + test + e2e
npm run db:migrate:local # apply D1 migrations locally
npm run seed:local       # deterministic simulated data (WS8)
npm run seed:remote -- --confirm
npm run seed:clear
npm run smoke -- --url http://localhost:5173
npm run warm:ideas       # pre-generate the 144 idea cache keys
```

## Deploy (Cloudflare)

```bash
npx wrangler login
npx wrangler d1 create ship60-db        # paste database_id into wrangler.jsonc
npx wrangler kv namespace create CACHE  # paste id into wrangler.jsonc
npx wrangler d1 migrations apply ship60-db --remote
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npm run build && npx wrangler deploy
npm run seed:remote -- --confirm        # simulated demo data only
npm run smoke -- --url https://ship60.<subdomain>.workers.dev
```

Create the Turnstile widget for the `workers.dev` hostname and set
`TURNSTILE_SITE_KEY` in `wrangler.jsonc`. Optional secrets (`RESEND_API_KEY`,
`GITHUB_TOKEN`) only enhance; everything degrades gracefully without them.

## Simulated-data caveats

- Colleges are real institutions; every student, ambassador, registration,
  referral, check-in, submission, evaluation and event is generated.
- The seed uses invented names and reserved contact patterns; it cannot reach a
  real person.
- The admin war room shows a persistent "Simulated data" banner and an
  include/exclude toggle. `/plan` labels the plan simulation and its charts.
  `/leaderboard` labels rows that come from simulated users.
- `GET /api/stats/public` excludes simulated rows, so the public counter stays
  honest at zero until real registrations arrive.
- Never quote seeded totals as campaign results. The real target is 500
  registrations; 520 is the plan from `src/shared/plan.ts`.

## Docs

- `PRD.md` — product requirements (source of truth)
- `MASTER_PROMPT.md` — build plan and workstream briefs
- `AGENTS.md` — rules for contributors/agents
- `DECISIONS.md` — decision log (options, choice, why, rejected)
- `TASKS.md` — workstream board
