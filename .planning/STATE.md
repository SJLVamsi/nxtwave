# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-04)

**Core value:** Register → refer → attend → qualify must work on a phone, driven by a
classmate's referral link and the student's own generated project card.
**Current focus:** Phase 4 — Hardening

## Current Position

Phase: 4 of 5 (Hardening)
Plan: 3 of 3 in current phase
Status: Phase complete — ready for Phase 5 (Deploy)
Last activity: 2026-10-04 — plans 04-01..03 executed by three parallel subagents;
`npm run verify` green (typecheck, lint 0 errors, 122 unit tests, 12 e2e).

Progress: [██████████] 100% of Phase 4

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

- Phase 4: duplicate registration requires proof of ownership; live identity only
  from token/cookie; Turnstile config fail-closed; DNS-aware SSRF; CSV/brief
  injection neutralised; idea keys resolve in all formats; admin defaults to
  simulated when only seeded rows exist.
- I2.x integration fixes: removed API shadowing, 101 pass-through, leaderboard
  simulated rows + labels, KV invalidation, `remoteBindings:false`, ASSETS binding.

### Pending Todos

- Security Lows accepted for the demo and logged: L1 token in `?t=` appears in
  observability logs (consider URL fragment post-demo), L5 admin session not
  revocable without rotating `SESSION_SECRET`.

### Blockers/Concerns

- Phase 5 needs human gates: `wrangler login`, Turnstile widget, secret values,
  confirmation before remote writes/deploy (AGENTS rule 10).

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
