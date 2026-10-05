# 05-redesign / 01 — Redesign implementer A

**Status:** done. Flight Deck visual world is live on `src/client/design/*` and `/`;
all required verification commands pass on the final tree.

## Scope

Authorized: `src/client/design/*`, `src/client/pages/landing/*`, `src/client/index.css`,
`index.html`, `public/fonts/*`, `public/_headers`. No API/worker/shared edits.

An interrupted prior pass had already rewritten tokens, components, `index.css`,
`index.html` and the landing page to DESIGN.md. This session audited that output
line-by-line against DESIGN.md §2–§10, fixed the defects found, re-verified fonts,
and produced fresh evidence. The design source is now compliant; no component
names or prop shapes changed.

## Files

Changed in this session:

- `src/client/pages/landing/LandingPage.tsx` — header CTA now `max-lg:hidden`
  (was `hidden lg:inline-flex`, which never hid: Tailwind v4 sorts `.inline-flex`
  after `.hidden`, both base utilities, so the button's base `inline-flex` won).
- `public/fonts/geist-latin.woff2`, `geist-latin-ext.woff2`,
  `geist-mono-latin.woff2`, `geist-mono-latin-ext.woff2` — replaced with freshly
  fetched Google Fonts v5 files (Chrome UA, CSS unicode-ranges match tokens.css).
- `src/client/pages/landing/Hero.tsx` — non-breaking space in h1 (“60 minutes”).
- `src/client/pages/landing/Sections.tsx` — straight apostrophes → curly (`’`)
  in rendered copy (agenda, who-it’s-for, FAQ). Words unchanged.
- `src/client/pages/landing/RegistrationForm.tsx` — email input `spellCheck={false}`.

Audited, already at spec (no changes needed): `index.css`, `design/tokens.css`,
`design/{Button,Chip,ProjectCard,Ticket,Toast,Skeleton,EmptyState,Stat,Countdown,SimulatedBadge,Input,Select,Typeahead,field,cn,index}.ts(x)`,
`public/_headers` (CSP `font-src 'self' data:` intact), `index.html` (Geist preload,
`theme-color`, `color-scheme`).

## Commands + results

| Command | Result |
|---|---|
| `npx tsc -b` | pass, 0 errors (transiently failed during the session on concurrent files owned by other agents — `me/LaunchpadPage.tsx`, `submit/SubmitPage.tsx`, `admin/PacingChart.tsx`; their owners fixed them, final run clean) |
| `npx eslint src/client/design src/client/pages/landing` | 0 errors, 5 pre-existing `react-refresh/only-export-components` warnings (same files/warnings as before the redesign) |
| `npm run build` | pass (tsc + vite + postbuild) |
| `npx playwright test tests/e2e/mobile.spec.ts tests/e2e/a11y.spec.ts` | 7 passed (mobile + desktop axe on `/`, `/leaderboard`, `/me`) |
| `npx playwright test tests/e2e/core-loop.spec.ts --project=mobile -g "referral link"` | 1 passed — landing chips → card → form → `/me` ticket, real flow |
| Scripted browser assertions (390×844) | header CTA hidden: true; sticky bar visible at top: true; bar hidden at form: true; `scrollWidth 390 = clientWidth 390`; reduced-motion card title `opacity 1, clip-path none, animation written-fade` |

## Screenshots

`/tmp/ship60-redesign-A/` (390×844 @3x and 1440×900, fresh run):

- `home-mobile-top.png`, `home-mobile-full.png`, `home-mobile-card-view.png`, `card-mobile.png`
- `home-desktop-top.png`, `home-desktop-full.png`, `home-desktop-card-view.png`, `card-desktop.png`

Inspected with the Read tool. One iteration applied (below); final pass has no
horizontal overflow, single accent discipline, mono data rows, 44px touch targets,
and the authored card reveal.

## Iteration

1. Detected via screenshot: green “Save my seat” pill still in the mobile header.
   Root cause: Tailwind v4 base-utility order (byte offsets in built CSS:
   `.hidden` 8956, `.inline-flex` 9035), so the class list intent lost. Fixed with
   `max-lg:hidden`. Re-shot: header clean at 390, desktop unchanged.
2. Copy polish: curly apostrophes and NBSP in h1; email `spellCheck={false}`.
   Spacing/contrast/hierarchy otherwise passed: ink-subtle on surface-1/2 ≈ 4.8–5.0:1,
   section rhythm 64/96px, more space above headings than below.

## Decisions

- **Header CTA on mobile stays hidden**, deferring to the DESIGN §7 sticky bottom
  action bar (single “Save my seat”). Fix preserves code intent; tested both states.
- **Fonts re-downloaded rather than trusted.** The prior binaries differed from
  Google Fonts v5; the checked-in files are now the exact official latin/latin-ext
  woff2s whose unicode-ranges match `tokens.css`. Variable weight 100–900 covers
  Geist 400–700 and Geist Mono 400–500.
- **No SimulatedBadge on landing counters.** `GET /api/stats/public` counts only
  `is_simulated = 0` rows (public.ts:545–548), so the displayed numbers are real;
  the honesty rule does not apply there.
- **Kept the prescribed landing structure** (chips → card in place → form panel →
  proof/agenda/FAQ → footer); no unrequested sections added during polish.

## Requests

None. No shared-file changes needed; no new dependencies.
