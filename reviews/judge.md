# Ship60 — Judge review (role-play: NxtWave Growth Challenge evaluators)

Reviewer: JUDGE (read-only). Date: 2026-10-04. Build under review: local
`npm run dev`, server on **:5174** (a second dev server already held :5173;
`PUBLIC_BASE_URL=http://localhost:5173`, both share the same local D1).
The D1 was **already seeded** (540 simulated users, 227 simulated check-ins,
120 submissions, 40 colleges, 12 flags); `npm run seed:local` was **not** run.
Playwright chromium at 390×844 and 1440×900. Evidence screenshots in
`.playwright-mcp/judge-*.png`; 5-page print PDF at `.playwright-mcp/judge-plan.pdf`.

## Verdict in one line

A genuinely strong, unusually honest submission that demonstrates every one of the
five criteria — held back from "moving directly to interview" by one unset deploy
variable that would break the core loop on the live asset, two seeded surfaces that
404, and a local demo DB polluted by test rows.

## Scorecard vs. the five stated criteria

| Criterion | Score | Evidence (verified live) |
|---|---|---|
| **Learnability** | 8.5/10 | 78 decision entries, 84 explicit "Rejected" rationales; platform facts re-verified against current docs and recorded when they differ from the PRD (DECISIONS P0.2 Vitest plugin, P0.5 Workers AI ids, D3.10 Lighthouse measured on compressed transport 98/100/100/91 with the raw 83 stated honestly). Ideas degrade to a hand-checked 48-idea bank when AI is unavailable (observed `source:"bank"`). |
| **Ownership** | 9/10 | The whole loop was walked and works: landing → project card (ECE+cricket → "Cricket Stats Storyteller") → register → seat ticket → `/me` Launchpad → copy/share link → `/r/CODE?ref=` cookie → second registration → `/live` check-in → referral flips to `qualified` (D1: `status=qualified`, `qualified_at` set) → referrer `/me` shows "1 person joined through you · 1 checked in" → leaderboard with countdown. Plus admin war room, host console, evaluator fallback, cert page, `/plan`, `/build`. 500-socket load reported and unit/e2e suites green. |
| **Intent to grow** | 8/10 | README, DECISIONS.md, `/build` (48k chars rendering the decision log live), workstream reports with failures recorded, "known residual" notes (SSRF DNS TOCTOU, WS2.8 bank-only warm). Deduction: the challenge's required "AI + Learning Notes" (2–3 × asked → AI suggested → changed) is only implicit inside a 487-line engineering log. |
| **Bias to ship** | 7/10 pre-deploy, 9/10 once deployed | Everything runs, builds and verifies locally; deploy commands, secrets list and smoke script exist. But no live URL was verified in this session (Phase 4 was pending human login/secrets), and the shipped config still points `PUBLIC_BASE_URL` at localhost (Critical 1 below). The one thing an evaluator clicks — a live link — is not proven yet. |
| **Problem solving & judgment** | 8/10 | The plan rejects the tempting ideas on purpose (paid ads, cold email, influencers), pays rewards on **attended** referrals not signups, puts the ask in trusted WhatsApp groups, gate-checks AI output with a deterministic quality filter rather than a second LLM judge (WS2.4), and fixes bugs with documented one-line changes (I2.1 shadowing, I2.2 101 pass-through). Deductions: account-takeover duplicate path (security C1, re-confirmed), seeded ambassador kits 404, and a channel table that doesn't reconcile with the plan. |

**Overall: 8.1/10 — strong submission; interview-worthy after the three changes below.**

### What is excellent (keep it in the video)

- `/plan` is exactly **5 slides**, prioritised 3+1 channels (ambassadors 47%, referral
  loop 21%, club co-hosts 15%, owned/boost 17%), with the funnel math
  (20 × 2.5 × 70 × 7% etc., k≈0.27) and the full ₹2,000 budget (₹1,600 reward pool,
  ₹400 Day-4 boost). Prints to exactly **5 A4 pages** with nav chrome hidden
  (verified: `/Type /Page` × 5). "Simulated data" badges on every plan chart with
  the sentence "targets, not measured campaign results".
- The student loop is genuinely end-to-end, on mobile, in under a minute per step.
- Honesty is real engineering here: leaderboard is labelled "Simulated data — this
  board includes seeded demo rows"; admin has a persistent banner plus an
  include/exclude toggle; `/api/stats/public` excludes simulated rows so the public
  counter stays at zero on a clean DB; CSV carries `is_simulated`.
- `/build` renders `DECISIONS.md` verbatim, so the "what AI suggested that you
  rejected" answer is inspectable and substantive: 84 Rejected lines — e.g. rejected
  paid ads/cold email/influencers as channels, rejected last-touch attribution
  (WS1.1), rejected a second LLM as quality judge (WS2.4), rejected deleting real
  rows to seed (WS8.1), rejected reporting a flattering local Lighthouse score
  (D3.10), rejected client-held live-room roles (WS6.2).

## The demo path (verified, under 3 minutes, exact clicks)

Pre-flight: use a **clean DB** (clear test rows) and, if on the live URL, set
`PUBLIC_BASE_URL` to it. Local: `npm run seed:clear && npm run seed:local`.

| Time | Do exactly this |
|---|---|
| 0:00 | Desktop `/plan`. Slide 1. Press → (slide 2). Say: "distribution through trust, not traffic". |
| 0:15 | Press → (slide 3: channel stack 245/110/80/60/25 + k≈0.27 + ₹2,000 budget). Press → (slide 4: 7-day curve). Press → (slide 5: measurement). |
| 0:40 | Phone 390×844, open `/`. Tap **CSE/IT/AI-ML** → tap **placements** → the card writes "Placement Prep Buddy". |
| 0:55 | Tap **Save my seat**; fill name, email, WhatsApp; type **CBIT** and tap the option; tick consent; tap **Save my seat**. Seat ticket appears → lands on `/me`. |
| 1:15 | `/me`: tap **Copy my link**; tap **Share on WhatsApp · English** (show the prefilled message; do not send). |
| 1:25 | Second tab: open `/r/<CODE>`, register the friend (chips + form). Return to referrer `/me`: "1 person joined through you · 0 checked in". |
| 1:40 | Second tab `/live`: tap **I'm here — check in**. Refresh referrer `/me`: "1 checked in". Open `/leaderboard` and back. |
| 1:55 | Desktop `/admin`, sign in (password from `.dev.vars`). Tick **Include simulated** → headline 520, pacing vs plan, press **Time-lapse replay (7 days)**, then funnel → channels → share variants → flags queue → daily brief → CSV. |
| 2:35 | `/build`: architecture SVG → module table → scroll to the decision log's Rejected lines (paid ads, cold email, influencer). |
| 2:50 | Close: "with 24 more hours: surface reminders, fix duplicate auth, ship cert PNGs." |

Feasible at a brisk pace; registration itself was ~35 s including chip picks and the
2.6 s ticket moment.

## Three highest-impact changes, ranked by impact on the 500-registration goal

1. **Make the public loop production-correct.** `wrangler.jsonc:59` ships
   `PUBLIC_BASE_URL: "http://localhost:5173"` and `baseUrl()` (public.ts:62-65)
   uses it unconditionally. On a live Worker, every `launchpadUrl`, ambassador
   referral link, share text and `/r` link points at **localhost** — the growth
   engine's shares are dead on the deployed asset. Fix: derive the base from
   `request.url` origin when the configured value is localhost, or set the var in
   the deploy step (and add it to the README deploy list). Verify by registering on
   the live host and opening the copied link in a second device/incognito.
   *Impact on the 500: directly blocks every referral/share registration on the
   asset that will actually be submitted.*
2. **Make the ambassador channel operational.** Every seeded ambassador's kit 404s:
   `/api/ambassador/:code` filters `is_simulated = 0` (public.ts:654), so the 20
   ambassadors listed in the admin table (RAMYAF57, …) cannot open their kit, even
   though `/og/:code.png` serves their card. Separately, cron writes
   `reminder:{d1,h2,m15}` (cron.ts:101) but nothing in `src/client/pages/admin/*`
   surfaces those ready-to-paste WhatsApp messages, so the reminder automation is
   half-wired. Ambassadors + reminders are 47% of the plan and drive the check-ins
   that qualify referrals; fix the filter (with a "Simulated data" badge on demo
   kits) and add the reminder panel. *Impact on the 500: the plan's #1 channel
   cannot be demoed or operated without it.*
3. **Demo-proof the war room and make the thought-process answer explicit.**
   Local test rows make the flagship screens look wrong: headline **570 of 500
   (100%)**, channels `e2e 62%` / `curl`, college "E2E Test College", seat
   **#988229**, AI-usage panel showing model **INJECTED_BY_ATTACKER**, duplicated
   load-test entries in the host help/shipped feeds. Add a `seed:demo` that removes
   non-simulated test rows (or a clean demo DB), default the admin to *include
   simulated* (labelled) when only simulated rows exist, and put a curated 3-item
   "asked → AI suggested → what I changed/rejected" block at the top of `/build`
   (the challenge's required AI + Learning Notes deliverable is currently implicit).
   *Impact on the 500: protects the honesty/credibility impression the whole
   submission is designed around, and covers a required submission item.*

## Critical

1. **Deploy-time base URL breaks the core loop (Critical).**
   `wrangler.jsonc:59` + `src/worker/routes/public.ts:62-65`,
   `src/worker/routes/og.ts:117-126`, `src/worker/routes/submissions.ts:364-365`.
   Unset/override at deploy or the live share loop is non-functional. Security
   review M1 flags the var; this review confirms the user-visible consequence
   (registration response, Launchpad "Your referral link", wa.me text all built
   from it — verified locally).
2. **Duplicate registration is an account takeover (Critical, pre-existing C1).**
   Verified again live: POST `/api/register` with an **existing phone/email** returns
   that user's `seatNo`, `refCode` and a fresh `token`, rotating their stored token
   (my test was handed the `victim.sec@example.com` Launchpad, seat #988229, from a
   known phone number). PRD M1 asks for a duplicate to return the existing
   Launchpad; that spec line is unsafe as written. This is exactly the kind of
   judgment call the challenge scores — return "already registered" and deliver the
   link by a channel the requester controls, or require the existing session.
   Security review C1 has the full proof; not re-litigated here.

## Honesty findings (AGENTS rule 5 / challenge "never present simulated as real")

- **Labelled correctly (verified):** admin banner + toggle, `/plan` charts,
  `/leaderboard` badge, README simulation notice + caveats. Good.
- **Unlabelled simulated certificate (Medium):** `/cert/cert_586b…` renders
  "Certificate of completion — Chaitanya Pandey … Verified certificate" for a seeded
  submission with no "Simulated data" mark. Public and unguessable, but a public
  artifact of simulated data. Add the same badge treatment when
  `submission.is_simulated = 1`.
- **Seeded public counter honesty is fine, but demo-empty (Low):** `/api/stats/public`
  excludes simulated rows as designed; on a clean deployed+seeded DB the landing
  counter reads 0/500 while the heading says "Students are already signing up"
  (UX M14 covers the copy fix).
- **No simulated aggregate is presented as real anywhere I could find.** The
  "570/520" numbers above come from **real test rows** polluting the local DB, not
  from simulated rows leaking into the real stream — the include/exclude split
  works; it is the fixture residue that is mislabelled (they are real rows of fake
  test users, shown without any label because they are not `is_simulated`).
  Cleaning them is demo hygiene, not an honesty failure.

## Other judge-relevant findings

- **Channel table does not reconcile with the plan (Medium).** With simulated
  included, the war room shows "Referral 362 (63.5%)" because ambassador-driven
  registrations are also referral rows (WS5 decision 4). The deck reports
  ambassadors 245 / referral 110 separately. A judge comparing `/plan` slide 3 with
  the war room sees two different campaign stories. Either split the buckets
  (referred_by + UTM channel) or annotate that ambassadors are counted inside
  "Referral".
- **Evaluator works and degrades gracefully (verified).** A submission with a live
  URL saved as `manual` with a clear message ("AI evaluator could not score it…
  queued for manual review") because local AI is off; the AI path itself needs
  `wrangler login`. Honest, but the 3-minute video should show a scored evaluation —
  record it against a logged-in/staged run.
- **Live room works (verified):** attendance incremented 6→7 on my check-in; host
  console shows step control, poll/quiz launchers, help queue and shipped feed (the
  four duplicate "Load T." rows are load-test residue — see change 3).
- **Print/PDF:** `/plan` print media hides `.plan-chrome`, shows all 5 slides
  (`display:block`), PDF is exactly 5 pages. Ready to submit.
- **`/build` decision log:** 48 388 chars, 84 "Rejected" — at the top of its class
  for the "what did AI suggest that you rejected" question, but a judge has to
  scroll; curate the top 3.
- **No live URL in the repo:** submission item 2 is "Working Asset — Live link /
  prototype / demo". The prototype is convincing; provide the workers.dev URL (after
  fixes 1–3) or the video must carry the demo.

## Disqualifying problems

None. No fabricated real-world results, no unlabelled simulated aggregate presented
as campaign performance, and no missing growth-plan deliverable. The only
submission-level risks are the unset public URL (Critical 1), the duplicate-token
auth hole (Critical 2, also a judgment signal), and the implicit AI-learning notes
(change 3).

## Method notes

- D1 read-only checks via `wrangler d1 execute … SELECT`; app writes were limited to
  the natural flow (two registrations, one check-in, one evaluator submission) and
  the admin session cookie. No repo files were modified; no git commands run.
- Server: `npm run dev` on :5174 (5173 already occupied). Ideas come from the bank
  (`source:"bank"`) because AI is remote-only without login; that is disclosed in
  DECISIONS WS2.8, not a defect.
