# PRD — Ship60
### A referral-powered registration engine for NxtWave's "Build Your First AI Project in 60 Minutes"

| | |
|---|---|
| Goal | 500 registrations from final-year engineering students |
| Constraints | 7 days, ₹2,000 budget, any AI tools |
| Deliverable | Working, deployed product on Cloudflare (Workers + D1 + KV + Durable Objects + Workers AI) |
| Build mode | One orchestrator agent + parallel subagents in OpenCode, contract-first |
| Status | Simulation. No real students are contacted. All demo data is labelled SIMULATED. |

---

## 0. TL;DR

The bottleneck for 500 registrations is not a landing page, it is **distribution through trust**. Final-year students register when a classmate drops a link in a WhatsApp group, not when they see an ad. So we build the machine that powers that: every registrant and every campus ambassador gets a personal referral link, a share card showing *the AI project they'll build*, a college leaderboard that turns it into a campus-vs-campus race, and an admin war room that tells us each night which colleges, ambassadors and messages are working.

Rewards are paid on **qualified referrals** (the referred friend actually attends), which protects what NxtWave really cares about: show-up rate, not vanity signups. The same system runs the live workshop (check-in, polls, "I'm stuck" queue) and evaluates submitted projects with AI, and every "I shipped it" result card carries the student's referral link, so the loop keeps feeding the next workshop.

---

## 1. The student

### 1.1 Who exactly we're targeting

**Primary: final-year B.Tech students (graduating 2027) in tier-2/3 engineering colleges in Telangana and Andhra Pradesh**, starting with ~25 colleges in and around Hyderabad, Vizag and Vijayawada. Branches: CSE / IT / AI-ML / Data Science first, then ECE / EEE students trying to move into software roles.

Why this slice: NxtWave's brand, community and Telugu-speaking audience are strongest here; the campaign runs in October, which is the middle of placement season; and these students have the biggest gap between "I use ChatGPT" and "I have built something with AI".

**Secondary: campus ambassadors** — class representatives, placement coordinators and tech club leads who are already admins of WhatsApp groups with 60–200 classmates each. 20–30 of them carry most of the campaign.

**Not targeting:** 1st/2nd years and working professionals. They can register, but they're tagged and excluded from the 500 target and the referral rewards.

### 1.2 Why they would care

| What's going on in their life | What the workshop gives them |
|---|---|
| Placement interviews ask "what have you built?" and their project section is a copied mini-project | A live, deployed AI project link + GitHub repo they can put on their resume the same day |
| Everyone around them talks about AI; very few have shipped anything, and that creates quiet anxiety | Proof to themselves that they can build with AI, in a format that is safe to fail in |
| Placement prep + internals leave no time for a course | 60 minutes, free, Sunday evening, laptop only |
| Too many "free webinars" turn out to be sales pitches | A concrete output they can see before registering (see 1.3) |

### 1.3 What makes them register

1. **Seeing their project before they register.** The landing page asks two questions (branch + one interest like cricket, movies, placements, food) and generates the specific project they'll build, e.g. "Placement Prep Buddy: an AI that turns any job description into 10 likely interview questions". It converts the vague promise into an object they want.
2. **A classmate asking them, inside a group they already trust.** Referral links shared in class WhatsApp groups by ambassadors and friends.
3. **Campus pride.** A public college leaderboard ("VNR 84 vs CBIT 71") gives ambassadors and students a reason to push.
4. **Under 30 seconds to register.** No OTP, no account creation, no payment page. Name, email, WhatsApp number, college, branch, year.
5. **Something to show afterwards.** Seat number, a share card, a certificate, and an "I shipped it" card for LinkedIn.

---

## 2. Success metrics

| Metric | Target | Why it matters |
|---|---|---|
| Registrations (final-year, deduplicated) | ≥ 500 | The ask |
| Share of registrations from referral links | ≥ 35% | Proves the loop works, not just broadcast |
| Registration conversion on landing page | ≥ 25% of unique visitors | Validates the project-preview hook |
| Colleges represented | ≥ 25 | Breadth for NxtWave's next campaigns |
| Live attendance (simulated in demo) | ≥ 40% of registrants | Free workshops typically see heavy drop-off; we optimise for it |
| Cost per registration | ≤ ₹4 | ₹2,000 / 500 |

---

## 3. Growth plan (this section is the content for the 5-slide deck at `/plan`)

### 3.1 Channels — prioritised, three plus one

1. **Campus ambassadors → class & department WhatsApp groups (primary, ~47% of registrations).** Recruit 20 final-year students with group-admin access across 15–20 colleges from NxtWave's community, LinkedIn, and club leads. Each gets an ambassador kit (personal link, 3 ready-to-paste messages including a Telugu-English one, a share card, best posting window 8–10 PM) and their own live stats page.
2. **Registrant referral loop (~21%).** Every registrant gets a link, a share card with their project on it, and reward tiers. Target viral coefficient k ≈ 0.27.
3. **Tech club co-hosting (~15%).** 6 clubs (coding clubs, IEEE/ACM student branches, developer student clubs) list the workshop as a co-hosted event and post it to their member groups and Instagram, in exchange for their logo on the page and a club shoutout in the session.
4. **Owned and organic (~17%).** Ambassador LinkedIn posts, NxtWave's own community channels, one Instagram reel, and a ₹400 boost test on Day 4 only if a post has already proven itself organically.

**Deliberately not doing:** paid ads as a main channel (₹2,000 buys too little reach to hit 500 on its own), cold email blasts (no consented list, spam risk, low trust), influencer collaborations (cost and timeline).

### 3.2 How the 500 come in

| Channel | Mechanism | Reach | Conversion | Registrations |
|---|---|---|---|---|
| Ambassadors → WhatsApp groups | 20 ambassadors × 2.5 groups × ~70 members | 3,500 | 7% | 245 |
| Club co-hosts | 6 clubs × ~300 members | 1,800 | 4.5% | 80 |
| Owned + organic | LinkedIn, NxtWave community, reel | ~3,000 | 2% | 60 |
| Boost test (Day 4) | ₹400 on a proven post | — | — | 25 |
| Referral loop | k ≈ 0.27 on the 410 above | — | — | 110 |
| **Total** | | | | **520** |

Planned cumulative pacing (used by the admin pacing chart):

| Day | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Cumulative target | 40 | 110 | 190 | 270 | 350 | 440 | 520 |

### 3.3 Budget — ₹2,000

| Item | Amount | Rule |
|---|---|---|
| Top-referrer reward pool | ₹1,600 | #1 ₹400, #2 ₹300, #3 ₹200, #4–#10 ₹100 each. Paid by UPI after the workshop, counted on **qualified** referrals only (referee attended). |
| Day 4 boost test | ₹400 | Only on a post that already outperformed organically. Kill if cost per registration > ₹15 and move the remainder into the pool. |
| Infrastructure | ₹0 | Cloudflare free tier, Workers AI free allocation, `workers.dev` subdomain. |

Non-cash rewards (cost ₹0): 1 referral unlocks an AI Project Prompt Pack; 3 unlock priority Q&A in the session; 5 qualified unlock a "Campus Builder" certificate; ambassadors get a LinkedIn shoutout and certificate.

### 3.4 Seven-day calendar (workshop on Day 7, Sunday 7:00 PM)

| Day | Action | Cumulative goal |
|---|---|---|
| 1 Mon | Recruit and onboard 20 ambassadors (15-min call + kit). Seed in NxtWave community. | 40 |
| 2 Tue | Ambassador wave 1: posts in 2–3 class groups each, 8–10 PM. | 110 |
| 3 Wed | Club co-host announcements. College leaderboard goes public. **Checkpoint:** below 150 → recruit 10 more ambassadors at colleges with zero registrations. | 190 |
| 4 Thu | Proof drop: 45-second screen recording of a project being built. Boost test. | 270 |
| 5 Fri | Referral nudge to all registrants ("you're 2 away from the Prompt Pack"). | 350 |
| 6 Sat | Ambassador wave 2 with social proof ("380 students from 24 colleges"). | 440 |
| 7 Sun | Morning last call. Reminders 2 h and 15 min before. Live check-in qualifies referrals. | 520 |

**Daily 9 PM review** in the admin war room: pacing vs plan, top/bottom colleges, which share message variant is producing referral visits, flagged signups. Every day ends with one decision written in the decision log.

### 3.5 Why it should work

Trust transfers through people, so the plan puts the link in the hands of classmates instead of buying attention. The project preview makes value concrete before the ask. College-level competition gives ambassadors a reason to keep pushing after day two. Paying for attended referrals instead of signups protects quality and aligns the incentive with what NxtWave needs from a free workshop. And the war room makes every day's decision data-driven instead of guesswork.

---

## 4. Product scope

### 4.1 Priorities

P0 is the core growth loop and the submission. P1 closes the loop at the workshop. P2 is polish. Ship all P0 before starting P1 integration.

| ID | Module | Priority |
|---|---|---|
| M1 | Landing page + AI project preview + registration | P0 |
| M2 | Referral attribution + fraud guards | P0 |
| M3 | My Launchpad (student dashboard) | P0 |
| M4 | Dynamic share cards (OG + story images) | P0 |
| M5 | Leaderboards (individual + college) | P0 |
| M6 | Admin war room | P0 |
| M7 | Ambassador kit + ambassador stats page | P0 |
| M12 | `/plan` growth deck + `/build` notes page | P0 |
| M13 | Simulation + seed data | P0 |
| M8 | Live workshop room (Durable Object) | P1 |
| M9 | AI project evaluator | P1 |
| M10 | Verifiable certificates | P2 |
| M11 | Reminder automation (Cron) | P2 |

### 4.2 Module specs

#### M1 — Landing page, project preview, registration
- **Hero is the project preview, not a slogan.** Two chip groups: branch (CSE/IT/AI-ML, ECE, EEE, Mech, Civil, Other) and interest (cricket, movies, placements, food, money, music, college life, health). Tapping both renders a project card: title, one-line pitch, what it does in 3 steps, tools used (beginner-friendly), and "you'll deploy this in 60 minutes". A "show me another" button cycles variants.
- Ideas come from `POST /api/ideas/preview`. Generated with Workers AI, cached in KV keyed `idea:{branch}:{interest}:{variant}` with 3 variants per combination (6 × 8 × 3 = 144 max generations, so AI cost is bounded). If AI fails or is slow (> 4 s), fall back to a static bank of ≥ 48 hand-checked ideas in `src/shared/idea-bank.ts`.
- Below the hero: what you walk away with (deployed link, GitHub repo, certificate), agenda as a real sequence, who it's for, a live counter of registrations and colleges (real data from D1, refreshed every 60 s), co-host club logos (placeholders), FAQ (Is it free? Do I need coding experience? What do I need? Will there be a sales pitch?).
- Registration form, inline on the same page, prefilled with the chosen idea: name, email, WhatsApp number (+91 validation), college (typeahead over `colleges` table, with "Other: type it"), branch, graduation year (2027 default), consent checkbox (DPDP Act wording: what's stored and why). Cloudflare Turnstile (invisible/managed).
- On success: show seat number with a small confirmation moment, then route to My Launchpad.
- **Acceptance:** registration completes in under 30 s on a 390×844 viewport; works inside the WhatsApp and Instagram in-app browsers; referral and UTM attribution survive the full flow; duplicate email or phone returns the existing Launchpad link instead of an error.

#### M2 — Referral attribution and fraud guards
- Every user gets a readable `ref_code`: first name (max 8 chars, ASCII, uppercase) + 3 random base32 chars, e.g. `RAHUL7K2`. Unique.
- `GET /r/:code` **serves a small HTML page** (not a bare 302) with `og:title`, `og:description`, `og:image` = that user's share card, so WhatsApp shows a rich preview. The Worker sets the `s60_ref` cookie (30 days, first touch wins), logs a `referral_landing` event with the `v` (message variant) query param, then redirects client-side to `/?ref=CODE`.
- On registration: referral recorded with status `pending`. Becomes `qualified` when the referee checks in to the live room (M8). Becomes `rejected` when an admin rejects a flag.
- Guards: self-referral (same email or phone as referrer) ignored; IP hash with > 5 registrations per hour is flagged; disposable email domain list flagged; Turnstile required in production; flagged users stay in the database and are shown in admin for review, never silently deleted.

#### M3 — My Launchpad (`/me`)
- Access: after registration, the client stores an opaque token (cookie, HttpOnly, 60 days). The Launchpad URL `/me?t=TOKEN` also works so it can be reopened from another device. Store only the SHA-256 of the token.
- Shows: a ticket with seat number and the student's project, referral link with copy button, share buttons — WhatsApp (3 message variants, A/B tracked via `v` param), LinkedIn, download story image for Instagram — reward tier progress, individual rank and college rank, list of their referrals (first name + status), add-to-calendar (`.ics` download + Google Calendar link).
- WhatsApp message variants (prefilled through `https://wa.me/?text=`):
  - `en`: "I'm building my first AI project live this Sunday in 60 minutes (free, by NxtWave). Mine is {project}. Join with my link and we'll build together: {link}"
  - `te`: "Bro, Sunday 60 mins lo oka AI project build chesi live deploy cheddam. Free workshop, NxtWave di. Nenu register ayya, nuvvu kuda join avvu: {link}"
  - `fomo`: "{collegeShort} is at #{collegeRank} on the leaderboard for NxtWave's AI build workshop. Free, 60 mins, Sunday. Let's push us up: {link}"

#### M4 — Share cards
- `GET /og/:code.png` (1200×630) and `GET /og/:code/story.png` (1080×1920): name, college, project title, seat number, workshop date, small QR or short link. Generated in the Worker with `workers-og` (Satori + resvg); cache in the Cache API / KV for 1 hour. WhatsApp does not render SVG previews, so output must be PNG.
- A generic card at `/og/default.png` for non-referral shares.

#### M5 — Leaderboards (`/leaderboard`)
- Two tabs: Students (top 50 by qualified referrals, then total referrals; display "Rahul K." + college short name, never email or phone) and Colleges (registrations, qualified referrals, active ambassadors).
- Computed by SQL, cached in KV for 60 s. Countdown to workshop at the top.

#### M6 — Admin war room (`/admin`)
- Auth: password from `ADMIN_PASSWORD` secret → signed, HttpOnly session cookie (HMAC with `SESSION_SECRET`), 12 h expiry. All `/api/admin/*` routes check it.
- Panels:
  - Headline: registrations vs 500, today's registrations, % from referrals, colleges, qualified referrals.
  - Pacing chart: actual cumulative registrations vs the planned curve in §3.2, with a projected day-7 total from the current run rate.
  - Funnel: landing views → idea generated → form started → registered → shared → referral landing → referral registered, with step conversion.
  - Channel table by `utm_source`/`utm_medium` and referral vs non-referral.
  - Colleges table with registrations, ambassadors, and a "no ambassador yet" highlight.
  - Ambassadors table: registrations driven, qualified, last activity; create ambassador (name, college, phone) → generates code and kit link.
  - Share-variant performance: landings and registrations per WhatsApp variant.
  - Flags queue: approve / reject.
  - Daily brief: rule-based recommendations (e.g. pacing below 80% → "recruit ambassadors at these 5 colleges with zero registrations"), plus an optional one-paragraph Workers AI summary of the day's numbers.
  - CSV export of registrations.
- If any simulated rows exist, show a persistent "Simulated data" banner and a toggle to include/exclude them.

#### M7 — Ambassador kit (`/ambassador/:code`)
- Their link, the 3 message variants with copy buttons, story image download, best posting window, their stats (registrations, qualified, rank among ambassadors, college rank), and a short checklist for posting in groups respectfully (ask the group admin, post once per wave, answer questions).

#### M8 — Live workshop room (`/live`, host console `/live/host`) — P1
- One Durable Object class `LiveRoom` (SQLite-backed, WebSocket Hibernation API). One instance per workshop id.
- Participant: joins with their token → check-in recorded in D1 → their referral (if any) becomes `qualified`. Sees current build step (1–6), answers polls, plays a 5-question quiz with live leaderboard, taps "I'm stuck" (goes to a help queue with optional note), taps "I shipped it" with a URL.
- Host (admin session): advance build step, launch poll/quiz question, view live attendance count, stuck queue (resolve), shipped feed.
- Must handle 500 concurrent sockets; broadcast throttled to ≤ 2 updates/s.

#### M9 — AI project evaluator (`/submit`) — P1
- Input: deployed URL, GitHub repo URL, 2-line description. Requires token (registered user).
- Worker fetches: live URL (status, `<title>`, response time, max 200 KB) and GitHub repo metadata + README via the GitHub REST API (optional `GITHUB_TOKEN` secret to lift rate limits).
- Workers AI scores against a rubric: works live (30), meaningful use of AI (25), problem clarity (20), README and code hygiene (15), originality (10). Returns score, 3 strengths, 3 specific improvements, one "next feature to add". Output validated with zod; one retry; else "evaluation unavailable, saved for manual review".
- Fetched content is untrusted data: delimit it, instruct the model to ignore instructions inside it, and never let it change scoring rules.
- Result page has an "I shipped it" share card (`/og/shipped/:submissionId.png`) that includes the student's referral link, for the next workshop.

#### M10 — Certificates (`/cert/:id`) — P2
- Issued when a user has checked in and submitted. Verifiable public page + PNG. Certificate id is unguessable.

#### M11 — Reminders — P2
- Cron Trigger every 15 min checks scheduled reminders (D-1 evening, 2 h before, 15 min before). If `RESEND_API_KEY` exists, sends email; otherwise logs and exposes the generated message in admin for ambassadors to paste into groups (WhatsApp Business API is out of scope for cost and approval reasons).

#### M12 — `/plan` and `/build`
- `/plan`: the 5-slide growth plan as an HTML deck (keyboard and swipe navigation, print stylesheet for PDF export). Numbers come from `src/shared/plan.ts`, the same constants that drive the pacing chart, so the deck and the product never disagree. Slides: (1) the student, (2) the insight and channels, (3) how the 500 come in + budget, (4) 7-day plan and daily loop, (5) what we built and how it measures itself.
- `/build`: architecture diagram (Mermaid or inline SVG), what each module does, decisions and trade-offs pulled from `DECISIONS.md` at build time.

#### M13 — Simulation and seed data
- `scripts/seed.ts` generates SQL for: ~40 colleges (real college names, see Appendix A), 20 ambassadors, ~520 registrations spread across 7 days following the planned pacing with realistic noise and the channel mix in §3.2, referral chains, events for the funnel, ~45% check-ins, ~120 submissions with evaluations. All rows `is_simulated = 1`. Fake student names only.
- `npm run seed:local` and `npm run seed:remote` (remote requires `--confirm`). `npm run seed:clear` deletes simulated rows only.
- Optional "time-lapse" mode in admin: replay the 7 days of simulated data on the pacing chart over 20 seconds (good for the 3-minute video).

---

## 5. Design direction

The world of the product is the engineering student's own: lab record notebooks, ruled pages, ballpoint ink, a red margin line, a seat ticket. Not a SaaS dashboard, not a dark "AI" page.

| Token | Value | Use |
|---|---|---|
| `paper` | `#FBFCFE` | Page background |
| `ink` | `#1F3A93` | Primary text accents, buttons, links (ballpoint blue) |
| `graphite` | `#2E333B` | Body text |
| `margin` | `#D7263D` | The single red margin rule on the hero, errors |
| `rule` | `#DDE5F2` | Ruled lines, table borders |
| `highlight` | `#FFE45C` | Used once: behind the generated project title |

- Type: **Archivo** (variable, use the expanded width for display headlines) + **Atkinson Hyperlegible** for body and forms (legible on low-end Android screens). Fallback stacks to system sans.
- The memorable element is the project card: it looks like a torn-out lab record page with the student's project written on it, and it becomes their share card and ticket. Spend boldness there; keep the rest quiet.
- Avoid: all-caps eyebrow labels, gradient blobs, identical rounded card grids, scattered entrance animations. One orchestrated moment only: the project card being "written" when generated. Respect `prefers-reduced-motion`.
- Admin war room can be denser and calmer: same tokens, tables over cards, one chart per question.
- Copy: plain, specific, student voice. Buttons say what happens ("Save my seat", "Share on WhatsApp", "Copy my link").
- Dark mode via tokens (`prefers-color-scheme`), mobile first, visible focus states, WCAG AA contrast.

---

## 6. Architecture

### 6.1 Stack
- **One Cloudflare Worker** serving both API and the SPA via Workers Static Assets, built with the Cloudflare Vite plugin (`@cloudflare/vite-plugin`).
- API: **Hono** + **zod**. Frontend: **React + Vite + React Router + Tailwind CSS v4 + TanStack Query**. Charts: Recharts (admin only, lazy-loaded).
- Data: **D1** (system of record), **KV** (idea cache, leaderboard cache, rate-limit counters), **Durable Objects** (live room), **Workers AI** (ideas, evaluator, daily brief), **Turnstile** (bot protection), **Cron Triggers** (reminders), Cache API (images).
- Images: `workers-og`.
- Tests: Vitest with `@cloudflare/vitest-pool-workers` for the Worker; Playwright for e2e at 390×844 and 1440×900.
- Package manager: npm. Node 20+. TypeScript strict.

### 6.2 Repository layout (ownership boundaries for parallel agents)

```
ship60/
  AGENTS.md                 # rules every agent follows (orchestrator writes in Phase 0)
  DECISIONS.md              # decision log: options, choice, why, what was rejected
  TASKS.md                  # board: workstreams, status, dependency requests, blockers
  PRD.md
  wrangler.jsonc
  migrations/               # D1 SQL migrations (orchestrator only)
  scripts/                  # seed, simulation, utilities (WS8)
  src/
    shared/                 # contracts: zod schemas, types, constants, plan.ts, idea-bank.ts (orchestrator only after Phase 0)
    worker/
      index.ts              # mounts all route modules (orchestrator only, pre-wired in Phase 0)
      env.ts                # Env bindings type
      lib/                  # db helpers, auth, rate limit, ai helpers (WS1 owns, others request)
      routes/
        public.ts           # register, me, stats, events, leaderboard (WS1)
        ideas.ts            # (WS2)
        referral.ts         # /r/:code HTML (WS1)
        og.ts               # share cards (WS4)
        admin.ts            # (WS5)
        live.ts             # (WS6)
        submissions.ts      # evaluator + certs (WS7)
      do/LiveRoom.ts        # (WS6)
      cron.ts               # reminders (WS7)
    client/
      main.tsx, App.tsx     # router pre-wired in Phase 0 (orchestrator only)
      design/               # tokens, base components (WS3 owns, others consume)
      pages/landing/        # (WS3)
      pages/me/             # (WS4)
      pages/leaderboard/    # (WS4)
      pages/ambassador/     # (WS4)
      pages/admin/          # (WS5)
      pages/live/           # (WS6)
      pages/submit/, cert/  # (WS7)
      pages/plan/, build/   # (WS8)
  tests/
    worker/                 # (WS9 + each WS adds its own unit tests)
    e2e/                    # (WS9)
```

### 6.3 Bindings (`wrangler.jsonc`)
- `DB` → D1 `ship60-db`
- `CACHE` → KV namespace
- `AI` → Workers AI
- `LIVE_ROOM` → Durable Object class `LiveRoom`, migration tag `v1` with `new_sqlite_classes: ["LiveRoom"]`
- `ASSETS` → static assets with SPA fallback (`not_found_handling: "single-page-application"`), and `run_worker_first` for `/api/*`, `/r/*`, `/og/*`, `/cert/*`
- Cron: `*/15 * * * *`
- Vars: `WORKSHOP_ID`, `WORKSHOP_START_ISO` (Sunday 19:00 IST), `TARGET_REGISTRATIONS=500`, `PUBLIC_BASE_URL`, `TURNSTILE_SITE_KEY`
- Secrets: `ADMIN_PASSWORD`, `SESSION_SECRET`, `TURNSTILE_SECRET_KEY`, optional `RESEND_API_KEY`, optional `GITHUB_TOKEN`
- Dev Turnstile test keys: site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`

### 6.4 Data model (D1, migration `0001_init.sql`)

```sql
CREATE TABLE colleges (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, short_name TEXT NOT NULL,
  city TEXT, state TEXT
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,              -- lowercased, trimmed
  phone TEXT NOT NULL UNIQUE,              -- E.164, +91XXXXXXXXXX
  college_id TEXT REFERENCES colleges(id),
  college_other TEXT,
  branch TEXT NOT NULL,
  grad_year INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','ambassador')),
  ref_code TEXT NOT NULL UNIQUE,
  referred_by TEXT REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  seat_no INTEGER NOT NULL UNIQUE,
  idea_key TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT,
  share_variant TEXT,                      -- variant that brought them, if referral
  ip_hash TEXT, user_agent TEXT,
  consent_at TEXT NOT NULL,
  flag_reason TEXT, flag_status TEXT CHECK (flag_status IN ('open','approved','rejected')),
  is_simulated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_users_college ON users(college_id);
CREATE INDEX idx_users_created ON users(created_at);
CREATE INDEX idx_users_referred_by ON users(referred_by);

CREATE TABLE referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES users(id),
  referee_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','rejected')),
  created_at TEXT NOT NULL, qualified_at TEXT,
  is_simulated INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id, status);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,      -- page_view | idea_generated | form_started | registered | share_clicked | referral_landing | checkin | submitted
  anon_id TEXT, user_id TEXT, ref_code TEXT,
  props TEXT,              -- JSON
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
  is_simulated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_events_type_time ON events(type, created_at);

CREATE TABLE checkins (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  workshop_id TEXT NOT NULL, checked_in_at TEXT NOT NULL,
  is_simulated INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  live_url TEXT NOT NULL, repo_url TEXT, description TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued','evaluated','failed','manual')),
  score INTEGER, evaluation TEXT,           -- JSON
  cert_id TEXT UNIQUE,
  is_simulated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
```
Seat numbers: assign inside the same batch as the insert using `COALESCE(MAX(seat_no),0)+1`; retry on unique conflict.

### 6.5 API contract (all request/response shapes defined as zod schemas in `src/shared/contracts.ts`)

| Method + path | Purpose | Auth |
|---|---|---|
| `POST /api/ideas/preview` | `{branch, interest, variant?}` → idea card | public, rate-limited |
| `POST /api/register` | form + `turnstileToken` + `ideaKey` → `{seatNo, refCode, launchpadUrl}` + sets cookie | public, rate-limited |
| `GET /api/me` | profile, idea, stats, tier, referrals, ranks | user token |
| `GET /api/stats/public` | `{registrations, colleges, workshopStartIso}` | public, cached 60 s |
| `GET /api/leaderboard?type=students\|colleges` | ranked rows | public, cached 60 s |
| `POST /api/events` | analytics beacon `{type, props, anonId}` | public, rate-limited |
| `GET /api/colleges?q=` | typeahead | public |
| `GET /r/:code` | HTML with OG tags, sets ref cookie | public |
| `GET /og/:code.png`, `/og/:code/story.png`, `/og/default.png`, `/og/shipped/:id.png` | images | public |
| `GET /api/ambassador/:code` | kit + stats | public by code (no PII of others) |
| `POST /api/admin/login`, `POST /api/admin/logout` | session | password |
| `GET /api/admin/overview`, `/pacing`, `/funnel`, `/channels`, `/colleges`, `/ambassadors`, `/variants`, `/flags`, `/brief` | war room data, `?includeSimulated=` | admin |
| `POST /api/admin/ambassadors`, `POST /api/admin/flags/:id` | manage | admin |
| `GET /api/admin/export.csv` | registrations export | admin |
| `GET /api/live/:workshopId/ws` | WebSocket upgrade → `LiveRoom` | user token or admin |
| `POST /api/submissions`, `GET /api/submissions/:id` | evaluator | user token |
| `GET /cert/:id` | certificate page | public |

Errors: JSON `{error: {code, message}}` with stable codes (`DUPLICATE`, `INVALID_INPUT`, `RATE_LIMITED`, `TURNSTILE_FAILED`, `UNAUTHORIZED`, `AI_UNAVAILABLE`).

### 6.6 Workers AI usage
- Ideas: a small, fast instruct model (e.g. `@cf/meta/llama-3.1-8b-instruct`, verify against the current model catalog); JSON output validated with zod; cached forever per key.
- Evaluator and daily brief: a stronger model (e.g. `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, verify availability and free-tier neuron cost). Evaluator calls are rate-limited per user (3/hour).
- Every AI call has a timeout, zod validation, one retry, and a non-AI fallback. Track AI calls as events so admin can show AI usage.

---

## 7. Non-functional requirements
- Mobile first: ≥ 90% of traffic will come from phones via WhatsApp. LCP < 2 s on Fast 3G emulation for the landing page; initial JS for landing < 150 KB gzipped (admin and live room code-split).
- Lighthouse mobile ≥ 90 for Performance, Accessibility, Best Practices, SEO on `/`.
- Works in WhatsApp and Instagram in-app browsers (no reliance on popups; copy-to-clipboard has a fallback).
- Privacy: minimum PII; consent text on the form; no PII on public pages or in OG images beyond first name + last initial + college; hashed tokens and IP hashes; CSV export admin-only.
- Security: rate limiting on all public POSTs (KV counters per IP hash), Turnstile in production, input validation everywhere, parameterised SQL only, admin cookie HttpOnly + Secure + SameSite=Lax, security headers (CSP, X-Content-Type-Options, Referrer-Policy).
- Free-tier safe: no paid APIs required; everything degrades gracefully if AI quota is exhausted.

---

## 8. Definition of done
1. `npm run typecheck`, `npm run lint`, `npm test` and `npm run e2e` pass.
2. E2E core loop passes on mobile viewport: open `/r/CODE` → see project preview → register → land on Launchpad → copy link → second user registers through it → referrer sees a pending referral → second user checks in to `/live` → referral becomes qualified → leaderboard updates.
3. Admin war room shows correct numbers on seeded data (verified against SQL counts in a test).
4. Deployed with `wrangler deploy`; production smoke test script passes against the live URL.
5. `/plan` renders the 5 slides and prints to a clean PDF.
6. `README.md` explains setup, local dev, seeding, deploy, and lists every simulated-data caveat.
7. `DECISIONS.md` has an entry for every non-obvious choice, including rejected alternatives.

---

## 9. Deployment (Cloudflare, Wrangler CLI)

```bash
npx wrangler login
npx wrangler d1 create ship60-db                 # paste database_id into wrangler.jsonc
npx wrangler kv namespace create CACHE           # paste id into wrangler.jsonc
npx wrangler d1 migrations apply ship60-db --local
npx wrangler d1 migrations apply ship60-db --remote
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npm run build && npx wrangler deploy
npm run seed:remote -- --confirm                 # simulated demo data
npm run smoke -- --url https://ship60.<subdomain>.workers.dev
```
Create the Turnstile widget in the Cloudflare dashboard for the `workers.dev` hostname and set `TURNSTILE_SITE_KEY`.

---

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Ambassadors post once and stop | College leaderboard, two scheduled waves, personal stats page, recognition |
| Referral gaming | Rewards on attendance only, flags queue, Turnstile, duplicate guards |
| AI quota or latency | KV cache with bounded keys, static idea bank, fallbacks |
| WhatsApp preview not showing | Server-rendered OG HTML on `/r/:code`, PNG images, tested with a link preview debugger |
| Judges think the numbers are real | Persistent "Simulated data" labels in admin and `/plan`; README states it |
| Over-building at the cost of the core loop | P0 first; P1 merges only after the e2e core loop is green |

---

## 11. Submission mapping

| NxtWave asks for | Where it comes from |
|---|---|
| Growth plan (≤ 5 slides) | `/plan` deck, printed to PDF |
| Working asset | Live `workers.dev` URL: landing, Launchpad, leaderboard, admin (share a demo admin password in the form), live room, evaluator |
| AI + learning notes | `DECISIONS.md` + your own notes of what you asked, what AI suggested, what you changed |
| 3-minute video | Suggested flow: 0:00 the insight (trust, not traffic) → 0:30 the funnel math → 1:00 demo the student loop on a phone → 1:50 admin war room with time-lapse replay → 2:30 what you rejected and what you'd do with 24 more hours |

---

## Appendix A — starter college list (seed + typeahead)

Telangana: CBIT, VNR VJIET, Vasavi College of Engineering, GRIET, MVSR Engineering College, CVR College of Engineering, Keshav Memorial Institute of Technology (KMIT), MGIT, Sreenidhi Institute of Science and Technology, Vidya Jyothi Institute of Technology, Anurag University, Malla Reddy Engineering College, JNTUH College of Engineering Hyderabad, BVRIT Narsapur, BVRIT Hyderabad, Vardhaman College of Engineering, CMR College of Engineering & Technology, Geethanjali College of Engineering and Technology, Matrusri Engineering College, Muffakham Jah College of Engineering and Technology, Institute of Aeronautical Engineering, St. Martin's Engineering College, Methodist College of Engineering and Technology, Stanley College of Engineering and Technology for Women, G. Narayanamma Institute of Technology and Science.

Andhra Pradesh: Andhra University College of Engineering, GVP College of Engineering, Vignan's Institute of Information Technology, VR Siddhartha Engineering College, RVR & JC College of Engineering, SRKR Engineering College, Vishnu Institute of Technology, Aditya Engineering College, Sree Vidyanikethan Engineering College, Lakireddy Bali Reddy College of Engineering.

(Verify names and short names before seeding; always allow "Other".)
