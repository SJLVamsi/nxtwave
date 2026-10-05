# 02-SUMMARY — Implementer B: operate surfaces (Flight Deck)

**Status:** done. All six page groups restyled to DESIGN.md, verified by typecheck,
lint, build, 122 worker tests, axe, and 390×844 screenshots. One route-shadowing
defect outside my file ownership is raised as a request (C1).

## Files

Rewritten (UI only; fetch logic, request payloads, tracking calls, and PRD copy
untouched):

- `src/client/pages/me/ui.tsx` — operate primitives on the design system:
  `PageShell` (wordmark bar + safe-area bottom), `Panel`, `SectionTitle`,
  `LoadingState`, `ErrorState`, `StatusBadge`, `ConnectionStatus`, `CopyButton`
  (clipboard + legacy fallback), `CheckIcon` (one 1.5 stroke), `CountdownLabel`.
- `src/client/pages/me/LaunchpadPage.tsx` — ticket first with mono seat in signal
  and perforated footer (countdown + SimulatedBadge), link row + primary
  "Copy my link" (`copy-link`), 3 WhatsApp variants + LinkedIn + story download
  with long-press hint, reward tiers as a hairline list with mono `current/min`
  progress, ranks as mono `Stat`s, referral hairline rows (`referral-list`),
  calendar links.
- `src/client/pages/leaderboard/LeaderboardPage.tsx` — chip tabs, header
  countdown, scope/date hairline strip, SimulatedBadge + note, mobile stacked
  label:value rows (no horizontal scroll) and hairline `md:` tables with mono
  tabular ranks.
- `src/client/pages/ambassador/AmbassadorPage.tsx` — kit panel (link + primary
  copy + story download), 2×2 hairline stats with mono `Stat`s, 3 message
  variants (message + copy + Open WhatsApp), checklist hairline rows.
- `src/client/pages/live/LivePage.tsx` — one column; check-in as the single
  primary action, 6 hairline step segments, poll/quiz options as full-width 44px
  rows, compact stuck/shipped panels with stacked mobile forms.
- `src/client/pages/live/HostPage.tsx` — host console: hairline build-step rows
  with mono numbers + Current, poll/quiz launch forms, help queue, shipped feed.
- `src/client/pages/submit/SubmitPage.tsx` — form panel with design inputs and
  `fieldControlClass` textarea + mono counter; result with `text-mono-stat`
  score, hairline rubric rows, strengths/improvements panels, actions.
- `src/client/pages/cert/CertPage.tsx` — certificate panel, mono workshop id and
  cert id, drawn check "Verified certificate", SimulatedBadge when simulated.
- Deleted `src/client/pages/me/fd.ts` — no second palette; all classes now come
  from the design system / `@theme` utilities (`bg-canvas`, `text-ink`,
  `border-hairline`, `rounded-panel`, `text-title`, …).

Not touched: `src/client/design/*`, `src/shared/*`, `src/worker/*`, landing,
admin, plan, build, `index.html`, `package.json`, routes in `App.tsx`.

## Commands and results

| Command | Result |
|---|---|
| `npx tsc -b` | clean (admin errors seen mid-run were fixed by the parallel admin workstream; final run passes) |
| `npx eslint src/client/pages/me …/cert` | clean, no output |
| `npm run build` | success (`tsc -b` + vite build, 155ms) |
| `npm test` | 8 files, **122 passed** |
| axe (`@axe-core/playwright`, wcag2a/aa + wcag21a/aa) on `/me` and `/leaderboard` @390×844 | **0 serious/critical** |
| horizontal overflow probe on all 7 routes @390×844 | `scrollWidth == clientWidth` on every route; 0 page errors |
| testid probe | `/me`: `seat-ticket`, `copy-link`, `referral-list`; `/live`: `checkin`, and `checked-in` after click |

Screenshots (390×844, DPR 2) in `/tmp/ship60-redesign-B/`, all inspected:

- `me.png`, `me-top.png` — ticket, link, shares, tiers, ranks, referrals, calendar.
- `leaderboard.png`, `leaderboard-top.png`, `leaderboard-colleges-top.png`.
- `ambassador.png`, `ambassador-top.png`.
- `live.png`, `live-top.png`, `live-checked-in.png` (green check, attendance 15).
- `live-host.png`, `live-host-top.png` (host shows reconnecting without admin session).
- `submit.png`, `submit-top.png`; `submit-result-manual.png` (real POST → `manual`);
  `submit-result-evaluated.png` (evaluated branch exercised with a stubbed POST).
- `cert-client.png` — React CertPage via client-side navigation.
- `cert.png`, `cert-top.png` — what a direct `/cert/:id` load shows (worker HTML, see C1).

## Decisions

1. **One palette.** Deleted `fd.ts`; every class resolves through
   `src/client/design/tokens.css` and Tailwind `@theme`. The old `var(--x, hex)`
   fallbacks are gone.
2. **Tier unlock off-by-one fixed.** `GET /api/me` returns `tierIndex` as the
   *count* of unlocked tiers (`public.ts:449-459`), but the page compared
   `index <= tierIndex`, marking tier 2 unlocked with 1 referral. Now
   `index < stats.tierIndex`; screenshot confirms tier 1 unlocked, tier 2 `1/3`.
3. **`CountdownLabel` stays local.** The design `Countdown` is the ticking value;
   the operate pages pair it with a label that must swap to "Live now" at zero.
   Composing both keeps the copy correct; the number itself is still mono
   tabular with no tick animation.
4. **Mobile forms stack.** Live/host input + action rows became full-width
   stacked controls (≥44px), per DESIGN §7; poll/quiz options are full-bleed
   `min-h-11` rows inside `overflow-hidden` panels.
5. **Leaderboard mobile = stacked label:value**, not a compressed table; desktop
   keeps real `<table>` ≥768px. Rubric on `/submit` stays hairline rows with mono
   `value/max` and a 2px `ink-muted` meter (data, not decoration).
6. **No authored entrance per operate page.** Motion is limited to press scale,
   color transitions and the live step segment (`--dur-ui`, `--ease-out`);
   reduced motion is handled globally in `index.css`.

## Requests (orchestrator / WS7)

1. **C1 — `/cert/:id` direct loads bypass the React page.** `certRoutes` in
   `src/worker/routes/submissions.ts:363-374` renders its own light-mode HTML
   (light background, `Atkinson Hyperlegible`, an eyebrow "NxtWave · Ship60"),
   which contradicts DESIGN.md and hides the restyled `CertPage` for direct
   links; `app.get("/cert/:id")` JSON at line 380 is shadowed by
   `certRoutes.all("/cert/*")`. Worker files are outside my ownership. Fix
   options: (a) delete `certRoutes` and let Static Assets/SPA handle `/cert/:id`,
   or (b) hand the server template to WS7 for a Flight Deck restyle. The React
   page is verified working via client-side navigation (`cert-client.png`).
2. **V1 — poll/quiz visual state.** The participant poll/quiz rows render only
   while a host broadcasts; the host console needs an admin session, so the
   full-width option rows were verified from code only. No change requested.
