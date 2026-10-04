# Requirements: Ship60

**Defined:** 2026-10-04
**Core Value:** Register → refer → attend → qualify must work on a phone, driven by a
classmate's referral link and the student's own generated project card.

## v1 Requirements

### Registration (REG)

- [x] **REG-01**: Student sees a generated project card from branch + interest before registering
- [x] **REG-02**: Registration completes in under 30 s on 390×844 with name/email/phone/college/branch/year/consent
- [x] **REG-03**: Turnstile verifies in production; duplicate email/phone never silently dead-ends
- [x] **REG-04**: Duplicate registration cannot mint a token without proof of ownership (Phase 4)
- [x] **REG-05**: Public POSTs are rate-limited; IP velocity and disposable domains are flagged, not deleted

### Referrals (REF)

- [x] **REF-01**: Every user gets a readable unique ref code and a personal `/r/:code` page with OG tags
- [x] **REF-02**: Referral status is pending → qualified on live check-in; rejected by admin
- [x] **REF-03**: Self-referral ignored; first-touch cookie attribution; variant captured

### Launchpad & sharing (LP)

- [x] **LP-01**: Launchpad shows seat ticket, project, referral link, copy, 3 WhatsApp variants, LinkedIn, story image, tiers, ranks, referrals, .ics
- [x] **LP-02**: The student's actual generated project appears on the Launchpad, share messages and OG cards (Phase 4)
- [x] **LP-03**: Story image download has an in-app-browser fallback (Phase 4)

### Leaderboards (LB)

- [x] **LB-01**: Student and college tabs, top 50, 60 s cache, no PII beyond first name + last initial
- [x] **LB-02**: Simulated rows carry a visible "Simulated data" label

### Admin (ADM)

- [x] **ADM-01**: Password + signed HttpOnly session; all admin routes gated
- [x] **ADM-02**: Overview, pacing vs plan, funnel, channels, colleges, ambassadors CRUD, variants, flags, CSV, rule-based + optional AI brief
- [x] **ADM-03**: `includeSimulated` toggle; persistent simulated banner; defaults to simulated data when only simulated rows exist (Phase 4)
- [x] **ADM-04**: CSV export neutralises formula injection (Phase 4)

### Ideas (IDEA)

- [x] **IDEA-01**: `POST /api/ideas/preview` with KV cache, AI generation, 4 s timeout, static fallback, quality filter
- [x] **IDEA-02**: Stored idea keys resolve back to full cards everywhere (Phase 4)

### Live room (LIVE)

- [x] **LIVE-01**: SQLite-backed DO with hibernation; check-in, polls, quiz, stuck queue, shipped feed; ≤ 2 updates/s
- [x] **LIVE-02**: Check-in qualifies the referral and updates the leaderboard
- [x] **LIVE-03**: Identity is taken only from token/cookie, never client-supplied headers (Phase 4)

### Evaluator & certificates (EVAL)

- [x] **EVAL-01**: SSRF-guarded live fetch + GitHub README, injection-safe rubric, zod output, manual fallback
- [x] **EVAL-02**: DNS-resolved private-IP rejection before fetch and per redirect hop (Phase 4)
- [x] **EVAL-03**: Certificates verifiable, unguessable ids, public page shows first name + last initial (Phase 4)

### Growth plan & build notes (PLAN)

- [x] **PLAN-01**: `/plan` 5 slides from `plan.ts`, keyboard/swipe, print to 5 clean pages
- [x] **PLAN-02**: `/build` renders architecture + `DECISIONS.md`; curated asked→AI→rejected examples (Phase 4)
- [x] **PLAN-03**: README setup/dev/seed/deploy + simulated-data disclosure + 3-minute demo script

### Simulation (SIM)

- [x] **SIM-01**: Deterministic seed, ~520 simulated registrations matching the plan, all `is_simulated = 1`
- [x] **SIM-02**: `seed:local`, `seed:remote --confirm`, `seed:clear`; demo reset script (Phase 4)

## v2 Requirements

- **NOTF-01**: Real email delivery via Resend when the key is configured
- **CERT-01**: Certificate PNG image generation
- **ADM-05**: Admin surfacing of cron reminder messages

## Out of Scope

| Feature | Reason |
|---------|--------|
| WhatsApp Business API | Cost and approval timeline (PRD M11) |
| Paid ads as main channel | ₹2,000 buys too little reach (PRD §3.1) |
| Student accounts/passwords | Token links keep registration under 30 s (PRD M1) |
| 1st/2nd-year targeting | Excluded from the 500 target (PRD §1.1) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REG-01, REG-02, REG-03, REG-05 | Phase 2 | Complete |
| REG-04 | Phase 4 | In Progress |
| REF-01, REF-02, REF-03 | Phase 2 | Complete |
| LP-01 | Phase 2 | Complete |
| LP-02, LP-03 | Phase 4 | In Progress |
| LB-01, LB-02 | Phase 2 | Complete |
| ADM-01, ADM-02 | Phase 2 | Complete |
| ADM-03, ADM-04 | Phase 4 | In Progress |
| IDEA-01 | Phase 2 | Complete |
| IDEA-02 | Phase 4 | In Progress |
| LIVE-01, LIVE-02 | Phase 3 | Complete |
| LIVE-03 | Phase 4 | In Progress |
| EVAL-01 | Phase 3 | Complete |
| EVAL-02, EVAL-03 | Phase 4 | In Progress |
| PLAN-01, PLAN-03 | Phase 3 | Complete |
| PLAN-02 | Phase 4 | In Progress |
| SIM-01 | Phase 3 | Complete |
| SIM-02 | Phase 4 | In Progress |

**Coverage:** v1 requirements: 28 total · mapped to phases: 28 · unmapped: 0 ✓

---
*Requirements defined: 2026-10-04 · Last updated: 2026-10-04 after Phase 3 review*
