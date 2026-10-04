# TASKS.md — workstream board

Status: `todo` | `in-progress` | `blocked` | `done`. Update your row and append to
Requests/Blockers. Orchestrator owns this file's structure.

## Workstreams

| WS | Scope | Owned paths | Status | Notes |
|----|-------|-------------|--------|-------|
| WS1 | Core API + referrals (M1 backend, M2, M5 backend) | `src/worker/routes/public.ts`, `referral.ts`, `src/worker/lib/*`, `tests/worker/public*` | done | All endpoints + `/r/:code`; 30 tests. Phase 2: catch-all removed, leaderboard includes simulated rows with `isSimulated`, KV invalidation on writes. |
| WS2 | Idea engine (M1 ideas, §6.6) | `src/worker/routes/ideas.ts`, `src/worker/lib/ideas/*`, `tests/worker/ideas*`, `scripts/warm-ideas.ts` | done | Cache + strict JSON + 4 s timeout + retry + bank fallback + quality filter; 11 tests. Full 144-combo remote warm deferred to Phase 4. |
| WS3 | Landing page + design system (M1 frontend, §5) | `src/client/design/*`, `src/client/pages/landing/*`, `public/` fonts/icons | done | Tokens + 9 components + landing; Lighthouse mobile 98/100/100/91; initial JS ≈110 KB gzip; axe clean; reduced-motion + dark verified. |
| WS4 | Launchpad, sharing, leaderboard, ambassador (M3, M4, M5 UI, M7) | `src/worker/routes/og.ts`, `src/client/pages/me/*`, `leaderboard/*`, `ambassador/*` | done | OG PNGs (default/referral/story/shipped) via inline WOFF fonts + Cache API; pages verified at 390×844; 9 tests. Design-system swap on `me/ui.tsx` deferred (inline PRD tokens). |
| WS5 | Admin war room (M6) | `src/worker/routes/admin.ts`, `src/client/pages/admin/*`, `tests/worker/admin*` | done | All panels + CSV + flags + time-lapse + brief; 27 tests assert headline numbers against raw SQL; `includeSimulated` toggle + persistent banner. |
| WS6 | Live workshop room (M8) | `src/worker/do/LiveRoom.ts`, `src/worker/routes/live.ts`, `src/client/pages/live/*`, `tests/worker/live*` | done | SQLite + hibernation DO, throttled broadcasts, check-in qualifies referrals; 500-socket load 500/500, 0 errors, 1.5 s; 14 tests. |
| WS7 | Evaluator, certificates, reminders (M9–M11) | `src/worker/routes/submissions.ts`, `src/worker/cron.ts`, `src/worker/lib/eval/*`, `src/client/pages/submit/*`, `cert/*` | done | SSRF-safe fetch, GitHub metadata, injection-safe rubric, cert SSR + JSON, cron reminders in KV; 12 tests. `/cert/:id.png` deferred. |
| WS8 | Simulation, /plan, /build, docs (M12, M13, §11) | `scripts/seed*.ts`, `src/client/pages/plan/*`, `build/*`, `README.md` | done | Deterministic seed (520 students, 40 colleges, 20 ambassadors, k=0.268, 227 check-ins, 120 evaluated submissions, all simulated); `/plan` 5 slides + 5-page PDF; `/build` renders `DECISIONS.md`. |
| WS9 | Test harness + e2e (§8) | `tests/e2e/*`, `playwright.config.ts`, `scripts/smoke.ts` | done | 2 projects (390×844, 1440×900); 5 specs — core loop, admin, plan, a11y, mobile; smoke 10/10. Phase 2: 12/12 e2e green after integration fixes. |

## Requests

Resolved in Phase 2 integration (see DECISIONS §I2):

1. ~~Unshadow `/api/ideas|admin|live|submissions`~~ — catch-all removed; e2e core loop + admin unskipped and green.
2. ~~axe findings on `/`~~ — resolved by WS3/WS9.
3. ~~`POST /api/admin/login` 400 on `{}`~~ — WS5 landed; admin e2e green.
4. ~~`GET /api/live/:id/ws` without upgrade header answers 400/401/403/426~~ — WS6 landed; core-loop check-in green.
5. ~~`securityHeaders()` throws on 101~~ — fixed (DECISIONS I2.2).
6. ~~`public/robots.txt`~~ — added (Lighthouse SEO audit fixed).
7. ~~Turnstile site key to the client~~ — `VITE_TURNSTILE_SITE_KEY` define added; production sets it at build time.
8. ~~`CollegeListResponseSchema`~~ — pinned to `CollegeOption[]`.
9. ~~`launchpadUrl` in DUPLICATE bodies~~ — duplicates return 200 with `isReturning`; WS3 handles both.
10. ~~`remoteBindings: false` for `npm run dev`~~ — added to `vite.config.ts`.
11. ~~Leaderboard simulated flag~~ — `isSimulated` per row + simulated rows included with the label (DECISIONS I2.3).
12. ~~ASSETS binding~~ — added; `wrangler types` regenerated.
13. ~~WS1 `idea_key` format~~ — seeded as `branch|interest`, matching `IDEA_BANK`.
14. ~~WS5 seeded UTM mapping~~ — seed uses channel ids as `utm_source`, mediums `whatsapp|paid|organic`.
15. ~~WS9 large fixture seat numbers~~ — noted; seed reserves existing seats so demos stay sane.

Still open (not blocking):

- **WS7/WS4 — `/cert/:id.png`** deferred; cert page points `og:image` at `/og/default.png`. A font-safe cert card can reuse WS4's `og-font.ts`.
- **WS5 — surface cron reminders** stored at KV `reminder:{d1,h2,m15}` in the admin war room.
- **WS3/WS4 — design-system swap**: `me/ui.tsx` still uses inline PRD tokens instead of `src/client/design/*`.
- **Phase 4 — `warm-ideas --remote`** needs the deployed URL (`--url` or `SHIP60_BASE_URL`).
- **Phase 4 — full 144-combo warm** and real Workers AI generation require `wrangler login`.

## Blockers

None. The two integration blockers (API shadowing, 101 pass-through) are fixed and
verified by the full e2e core loop.
