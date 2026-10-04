# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-04)

**Core value:** Register → refer → attend → qualify must work on a phone, driven by a
classmate's referral link and the student's own generated project card.
**Current focus:** Phase 4 — Hardening

## Current Position

Phase: 4 of 5 (Hardening)
Plan: 0 of 3 in current phase
Status: Ready to execute
Last activity: 2026-10-04 — GSD adopted; planning artifacts written; four review
reports landed (`reviews/*.md`); fixes being dispatched as plans 04-01..03.

Progress: [░░░░░░░░░░] 0% of Phase 4

## Performance Metrics

**Velocity:**
- Total plans completed: 3 phases in one session
- Average duration: n/a (agent-orchestrated)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 1 | ~1 h | — |
| 2. Core loop | 9 WS | ~2 h | — |
| 3. Live & evaluation | 9 WS + e2e | ~1 h | — |

**Recent Trend:** stable

## Accumulated Context

### Decisions

Full log in `DECISIONS.md`. Recent decisions affecting current work:

- I2.x integration fixes: removed API shadowing, 101 pass-through, leaderboard
  simulated rows + labels, KV invalidation, `remoteBindings:false`, ASSETS binding.
- Phase 4 rulings pending: duplicate registration returns no token without proof;
  live identity from token/cookie only; Turnstile fails closed outside dev.

### Pending Todos

- Security Mediums/Lows not in Phase 4 scope are tracked in `reviews/security.md`
  (L1 token-in-URL logging, L5 admin session revocation) and logged as accepted.

### Blockers/Concerns

- Deploy needs human gates: `wrangler login`, Turnstile widget, secrets, remote
  writes (AGENTS rule 10).

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Certificates | `/cert/:id.png` image | Deferred | Phase 3 (WS7) |
| Admin | Surface cron reminders in war room | Deferred | Phase 3 (WS7 request) |
| Design | Swap `me/ui.tsx` to design-system components | Deferred | Phase 3 (WS4) |

## Session Continuity

Last session: 2026-10-04
Stopped at: Phase 3 reviews complete; Phase 4 plans written, dispatch next.
Resume file: None
