# Ship60

## What This Is

A referral-powered registration engine for NxtWave's free workshop "Build Your First
AI Project in 60 Minutes". Final-year engineering students see the exact AI project
they will build, register in under 30 seconds, share a personal referral link, and
compete on a college leaderboard; the team operates it from an admin war room. Built
and deployed on Cloudflare Workers (Static Assets, D1, KV, Durable Objects, Workers
AI, Turnstile, Cron).

## Core Value

Registrations come through trust: a classmate's referral link in a WhatsApp group,
made concrete by the student's own generated project card. If everything else fails,
the register → refer → attend → qualify loop must work on a phone.

## Requirements

### Validated

- ✓ Landing page with AI project preview, chips, Turnstile, inline registration — Phase 2
- ✓ Referral attribution, fraud guards, `/r/:code` OG landing, share cards — Phase 2
- ✓ My Launchpad: ticket, referral link, WhatsApp/LinkedIn share, tiers, ranks, .ics — Phase 2
- ✓ Leaderboards (students + colleges) with 60 s cache — Phase 2
- ✓ Admin war room: pacing, funnel, channels, colleges, ambassadors, variants, flags, CSV, brief — Phase 2
- ✓ Idea engine: AI + static bank fallback, KV cache, quality filter — Phase 2
- ✓ Live room (Durable Object + hibernation): check-in, polls, quiz, stuck queue, shipped feed — Phase 3
- ✓ Evaluator (SSRF-guarded, injection-safe), certificates, cron reminders — Phase 3
- ✓ Deterministic simulator + `/plan` deck + `/build` — Phase 3
- ✓ e2e core loop green on mobile viewport; full `npm run verify` — Phase 3

### Active

- [ ] Close security review findings: duplicate-registration takeover, live header forgery, Turnstile fail-open, DNS SSRF, event poisoning, missing SPA headers, CSV injection, brief injection
- [ ] Correctness: real `idea_key` resolution everywhere, deploy-correct `PUBLIC_BASE_URL`, seeded ambassador kits, admin simulated default
- [ ] UX/perf: project-card visibility, form error clearing, cron copy, AA contrast, `/plan` eyebrows, FOMO rank-1, story-image download, font preload, no prod sourcemaps
- [ ] Deploy to Cloudflare with real D1/KV/Turnstile/secrets and run production smoke

### Out of Scope

- Real email/SMS delivery without `RESEND_API_KEY` (cron logs + admin copy instead) — cost/approval
- WhatsApp Business API — cost and approval
- Paid ads as a channel — ₹2,000 buys too little reach (PRD §3.1)
- Accounts/passwords for students — token links only, per PRD M1/M3

## Context

- Challenge simulation: no real students are contacted; every seeded row is
  `is_simulated = 1` and labelled "Simulated data" wherever it appears.
- Target: final-year B.Tech students in tier-2/3 Telangana/AP colleges, arriving
  from WhatsApp on low-end Android phones (PRD §1).
- Built contract-first with parallel workstreams WS1–WS9; decision log in
  `DECISIONS.md`, workstream board in `TASKS.md`, build plan in `MASTER_PROMPT.md`.
- Phase 3 reviewers (security, mobile/perf, UX/copy, judge) produced
  `reviews/*.md`; Phase 4 remediation is driven by those findings.

## Constraints

- **Tech stack**: one Cloudflare Worker + React SPA via `@cloudflare/vite-plugin`;
  Hono + zod; D1/KV/DO/Workers AI/Turnstile/Cron — free tier only.
- **Budget**: ₹2,000 campaign, ₹0 infrastructure (PRD §3.3).
- **Performance**: Lighthouse mobile ≥ 90, landing JS < 150 KB gzip, LCP < 2 s on
  Fast 3G (PRD §7).
- **Honesty**: simulated data always labelled; never presented as real (AGENTS rule 5).
- **Security**: parameterised SQL, zod on every input, rate limits on public POSTs,
  hashed tokens, no PII on public surfaces, untrusted content never treated as
  instructions (AGENTS rule 9).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Contract-first Phase 0, parallel WS1–WS9 | 9 modules, disjoint ownership, one orchestrated build | ✓ Good |
| `@cloudflare/vitest-plugin` + `remoteBindings:false` | Current supported local test path | ✓ Good |
| Rewards on qualified (attended) referrals only | Protects show-up rate, aligns incentives | ✓ Good |
| Static idea bank fallback (48 ideas) | Bounded AI cost, never blocks registration | ✓ Good |
| Leaderboard includes simulated rows with visible label | Demoable campus race, honesty rule kept | ✓ Good |
| Duplicate registration no longer reissues tokens (Phase 4) | Closes account takeover | — Pending |
| Live identity only from token/cookie, never client headers (Phase 4) | Closes auth bypass | — Pending |

---
*Last updated: 2026-10-04 after Phase 3 review + GSD adoption*
