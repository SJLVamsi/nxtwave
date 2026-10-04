# Roadmap: Ship60

## Overview

Ship60 was built contract-first in one session: Phase 0 froze schemas and bindings,
Phases 1–3 delivered all nine workstreams in parallel, integrated the core loop, and
reviewed it through four lenses. Phase 4 closes the review findings (security,
correctness, UX/perf) and Phase 5 deploys to Cloudflare with a production smoke test
and handoff report.

## Phases

- [x] **Phase 1: Foundation** - Contracts, scaffold, migrations, shared libs, docs
- [x] **Phase 2: Core loop** - Registration, referrals, Launchpad, share cards, leaderboards, admin, ideas, plan/seed
- [x] **Phase 3: Live & evaluation** - Live room, evaluator, certificates, reminders, e2e harness
- [ ] **Phase 4: Hardening** - Close security/correctness/UX findings from the four reviews
- [ ] **Phase 5: Deploy & handoff** - Real D1/KV/Turnstile/secrets, deploy, smoke, report

## Phase Details

### Phase 1: Foundation
**Goal**: Every contract, binding and shared helper exists and the stubs compile and test.
**Depends on**: Nothing (first phase)
**Requirements**: (infrastructure)
**Success Criteria**:
  1. `npm run typecheck && npm test` pass on stubs
  2. D1 migration applies locally; `wrangler types` generates bindings
  3. AGENTS.md, DECISIONS.md, TASKS.md, README exist and are committed
**Plans**: complete (commit 869f6cd)

### Phase 2: Core loop
**Goal**: A student can register through a referral link and the admin can see it.
**Depends on**: Phase 1
**Requirements**: REG-01..03, REG-05, REF-01..03, LP-01, LB-01..02, ADM-01..02, IDEA-01
**Success Criteria**:
  1. Landing generates a project card and registers in under 30 s on 390×844
  2. `/r/:code` sets attribution and shows OG tags; referral shows pending on the Launchpad
  3. Admin war room numbers match raw SQL on seeded data
**Plans**: complete (commit afa6b31)

### Phase 3: Live & evaluation
**Goal**: Check-in qualifies referrals; submissions are evaluated safely; the deck and demo data exist.
**Depends on**: Phase 2
**Requirements**: LIVE-01..02, EVAL-01, PLAN-01, PLAN-03, SIM-01
**Success Criteria**:
  1. Core-loop e2e passes on mobile: referral → register → pending → check-in → qualified → leaderboard
  2. 500-socket load test passes; evaluator resists injected README instructions
  3. `/plan` prints to 5 clean pages; seed is deterministic and all-simulated
**Plans**: complete (commits afa6b31, 17a83d0)

### Phase 4: Hardening
**Goal**: No open Critical/High findings from the security, mobile/perf, UX/copy and judge reviews.
**Depends on**: Phase 3
**Requirements**: REG-04, LP-02..03, ADM-03..04, IDEA-02, LIVE-03, EVAL-02..03, PLAN-02, SIM-02
**Success Criteria**:
  1. Duplicate registration cannot mint a token; live identity ignores client headers
  2. Real registrations resolve their project on Launchpad/share/OG; share links use the deploy host
  3. `npm run verify` green; every fix committed with a DECISIONS entry
**Plans**: 3 plans
- [ ] 04-01: Security-critical backend fixes
- [ ] 04-02: Correctness fixes (idea keys, base URL, ambassador kits, admin defaults)
- [ ] 04-03: Client UX, performance and infra fixes

### Phase 5: Deploy & handoff
**Goal**: Live `workers.dev` URL serving the real core loop, with a production smoke pass.
**Depends on**: Phase 4
**Requirements**: (delivery)
**Success Criteria**:
  1. `wrangler deploy` succeeds with real D1/KV ids and secrets set
  2. Production smoke + Playwright core loop pass; `/r/CODE` link preview returns a PNG
  3. Handoff report with URLs, test results, top decisions and demo path
**Plans**: 1 plan (human-gated: login, Turnstile widget, secrets, remote writes)

## Progress

**Execution Order:** 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | complete | Complete | 2026-10-04 |
| 2. Core loop | complete | Complete | 2026-10-04 |
| 3. Live & evaluation | complete | Complete | 2026-10-04 |
| 4. Hardening | 0/3 | In progress | - |
| 5. Deploy & handoff | 0/1 | Not started | - |
