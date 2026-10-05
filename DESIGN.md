# DESIGN.md — Ship60 "Flight Deck"

The product is a 60-minute launch. The interface is a launch console: near-black,
precise, quiet chrome around one signal accent, mono numerals for data, hairline
grid, and one authored motion moment — the project card writing itself.

This file is the binding design contract for every page. Tokens are exact; do not
invent variants. It replaces the previous "lab notebook" direction.

## 1. World

- Near-black canvas, four-step surface ladder, 1px hairlines. Depth comes from
  surface lift + hairline, never from drop shadows (except true overlays).
- One chromatic accent: **signal lime**. It marks the primary action, live state,
  focus, and the seat number. Nothing else is colored.
- Geist for voice, Geist Mono for data (seat, rank, ref code, countdown, stats).
- The project card is the hero object: a hairline panel with the project title in
  display type, mono meta rows, and the one authored reveal.
- Operate surfaces are dense and scannable; tables over cards; one chart per
  question in admin.
- Light mode is not shipped. `color-scheme: dark` on `<html>`.

## 2. Tokens (exact)

```css
:root {
  /* surfaces */
  --canvas: #0a0b0d;
  --surface-1: #121417;
  --surface-2: #171a1e;
  --surface-3: #1e2227;
  --hairline: #272b31;
  --hairline-strong: #3a3f47;

  /* ink */
  --ink: #f4f6f8;
  --ink-muted: #b9c0c9;
  --ink-subtle: #7d8590;

  /* accent + semantics */
  --signal: #c8f250;        /* primary action, live, focus, seat number */
  --signal-ink: #0a0b0d;    /* text on signal */
  --success: #3dd68c;       /* qualified */
  --warning: #ffb224;       /* pending */
  --danger: #ff5c5c;        /* errors, rejected */
  --info: #6cb8ff;          /* informational links */

  /* motion (Emil Kowalski) */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --dur-press: 140ms;
  --dur-ui: 180ms;
  --dur-panel: 240ms;
}
```

Tailwind v4 bridge (`@theme`): `--color-canvas`, `--color-surface-1..3`,
`--color-hairline`, `--color-ink`, `--color-ink-muted`, `--color-ink-subtle`,
`--color-signal`, `--color-success`, `--color-warning`, `--color-danger`.
Utilities: `bg-canvas`, `bg-surface-1`, `border-hairline`, `text-ink`,
`text-ink-muted`, `text-signal`, `font-display`, `font-mono`.

## 3. Typography

- **Display / UI: Geist** (self-hosted woff2, weights 400/500/600/700, Latin).
- **Data: Geist Mono** (400/500). Used only for seat numbers, ref codes, ranks,
  countdowns, percentages, table numerics, and code.
- Fallbacks: `Geist, "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
  and `"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace`.

Scale (mobile-first; clamp for desktop):

| Role | Size | Weight | Tracking | Line height |
|---|---|---|---|---|
| display-xl (hero h1) | clamp(2.5rem, 9vw, 4.5rem) | 600 | -0.035em | 1.02 |
| display-lg (section h2) | clamp(1.75rem, 5vw, 2.75rem) | 600 | -0.03em | 1.08 |
| title (card/panel h3) | 1.25rem | 600 | -0.02em | 1.2 |
| body | 1rem | 400 | 0 | 1.5 |
| body-sm | 0.875rem | 400 | 0 | 1.5 |
| label (form labels, table heads) | 0.8125rem | 500 | 0.01em | 1.3 |
| mono-data | 0.875rem | 500 | 0 | 1.4 |
| mono-stat (seat/rank hero) | clamp(2rem, 7vw, 3rem) | 500 | -0.02em | 1 |

Rules: no all-caps anywhere (kickers, eyebrows, section numbers are banned);
headings use `text-wrap: balance`; numbers use `font-variant-numeric: tabular-nums`;
use `…`, curly quotes, non-breaking spaces before units.

## 4. Geometry and spacing

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Radii: inputs/buttons 10px, panels 14px, chips/pills 9999px, avatars 50%.
- Borders: 1px `--hairline`; hover/focus lift uses `--hairline-strong`.
- Max content width 1120px; landing hero copy measure ≤ 34ch; body measure 65–75ch.
- Sections: 64px vertical on mobile, 96px desktop. More space above a heading
  than below it.
- No shadows except overlays/menus (`0 16px 40px rgba(0,0,0,.5)`); no colored
  glows; no gradient backgrounds, no gradient text, no glass.

## 5. Components (replace existing implementations)

All components live in `src/client/design/` and export from `index.ts`. Keep
existing prop names where pages already use them; add new props only additively.

- **Button** — variants `primary` (signal bg, `--signal-ink` text), `secondary`
  (surface-2 bg, hairline border, ink text), `ghost` (transparent, ink-muted),
  `danger`. Heights: md 44px, lg 52px; `:active { transform: scale(0.97) }`
  with `--dur-press`; `:disabled` 45% opacity, no transform; loading shows an
  inline spinner and keeps width stable. Focus: `outline: 2px solid var(--signal)`
  offset 2px via `:focus-visible`.
- **Input / Textarea / Select** — surface-1 bg, hairline border, 44px min height,
  10px radius, ink text, `--ink-subtle` placeholder ≥4.5:1; label above (13px/500),
  error below in `--danger` with the fix, not just the problem. Focus: signal
  border + 2px signal ring at 40%.
- **Typeahead** — same input, listbox as surface-2 panel with hairline, 44px rows,
  keyboard nav, `aria-expanded`, no layout shift.
- **Chip** — pill, surface-2 bg, hairline border, 36px height (44px on touch via
  padding), selected = signal bg + signal-ink text + signal border; toggle
  semantics with `aria-pressed`. No entrance animation.
- **ProjectCard** — the hero object. surface-1 panel, 14px radius, hairline, mono
  meta row (branch · interest · 60 MIN), display title, one-line pitch, three
  numbered steps as a hairline-divided list, tools as chips, footer line. The one
  authored moment: on generate, the title reveals with a mono caret using
  `clip-path`/opacity over 320ms `--ease-out`; under `prefers-reduced-motion`,
  fade only.
- **Ticket** — seat ticket: surface-2 panel, mono seat number in `--signal` at
  mono-stat size, name, project, workshop time; perforated hairline between body
  and footer.
- **Toast** — bottom center on mobile above safe area, surface-3, hairline,
  `aria-live="polite"`, enter translateY(8px)+opacity 180ms `--ease-out`, exit
  120ms, transitions not keyframes.
- **Skeleton** — surface-2 blocks with a slow 1.6s opacity pulse; reduced motion
  static.
- **EmptyState** — one line of copy + one action; no illustrations.
- **Stat** — mono number + label; used in admin and leaderboard.
- **Countdown** — mono tabular, updates each second, no animation on tick.
- **SimulatedBadge** — pill, warning text on warning/12% tint, label exactly
  "Simulated data".

## 6. Motion (Emil Kowalski rules, binding)

- Curves: `--ease-out` for enter/exit, `--ease-in-out` for on-screen movement,
  `ease` for hover/color. Never `ease-in`. Never `transition: all`.
- Durations: press 140ms, tooltips/popovers 150ms, dropdowns 180ms, panels 240ms,
  overlays 280ms. UI stays under 300ms.
- Enter from `opacity: 0; transform: scale(0.96) translateY(4px)` — never scale(0).
- Buttons/pressables scale to 0.97 on `:active`.
- Hover effects only inside `@media (hover: hover) and (pointer: fine)`.
- Stagger only for the three step rows of a generated card (40ms apart); never
  for whole sections.
- `prefers-reduced-motion: reduce` removes transforms; keep opacity/color.
- One authored moment per page, not one identical entrance everywhere.

## 7. Mobile-first rules

- Design at 390×844 first; verify no horizontal scroll on every route.
- Touch targets ≥44px; spacing between them ≥8px.
- Landing: sticky bottom action bar (surface-1, hairline top, safe-area padding)
  with "Save my seat" that scrolls to the form and shows the live seat count in
  mono. Hide when the form is in view.
- Inputs: `type`, `inputmode`, `autocomplete`, `spellcheck=false` for email;
  `touch-action: manipulation`; no zoom-blocking.
- Safe areas: `env(safe-area-inset-bottom)` on the sticky bar and toasts.
- Tables on mobile become stacked hairline rows (label: value), never horizontal
  scroll; admin keeps real tables ≥768px.
- No popups; copy uses `navigator.clipboard` with fallback.

## 8. Page direction

- **Landing**: no eyebrow, no slogan-first hero. H1 = the promise; immediately
  below, the two chip groups; the ProjectCard appears in place; then the form in
  a hairline panel; then proof (what you leave with, agenda as a real 6-step
  sequence, FAQ as native `<details>`); footer. Live counters as mono stats, no
  card grid. Co-host logos as a quiet mono row.
- **Launchpad**: ticket first, then share actions (3 WhatsApp variants as
  secondary buttons, LinkedIn, story download), reward tiers as a hairline list
  with mono progress, ranks as two stats, referral list as rows, calendar links.
- **Leaderboard**: tabs as chips; students/colleges as hairline tables with mono
  ranks and tabular numbers; countdown in the header; simulated badge when data
  is simulated.
- **Admin**: top bar with mono stats; pacing chart (Recharts) restyled to dark
  surfaces/signal line/hairline grid; funnel as rows with mono percentages;
  tables dense; flags queue as rows with approve/reject buttons; simulated banner
  persistent.
- **Live**: one column; build-step progress as 6 hairline segments; check-in as
  the single primary action; poll/quiz options as full-width 44px rows; stuck and
  shipped as compact panels.
- **Plan**: 5 full-viewport slides, display type, one chart, print stylesheet
  keeps exactly 5 pages; no eyebrows, no section numbers.
- **Build**: architecture as inline SVG with hairline strokes + signal accents;
  decision log rendered as hairline rows.

## 9. Preservation contract (non-negotiable)

- Keep every `data-testid` used by `tests/e2e/selectors.ts`: `branch-<name>`,
  `interest-<name>`, `idea-another`, `project-card`, `seat-ticket`, `register-*`,
  `copy-link`, `referral-list`, `checkin`, `checked-in`, `admin-password`,
  `admin-login`, `admin-overview`, `pacing-chart`, `flags-queue`, `plan-slide`.
- Keep all user-facing copy that tests assert (PRD M1/M3/M7 WhatsApp variants,
  FAQ questions, button labels like "Save my seat", "Copy my link", error copy).
  Restyling may change layout, not meaning.
- Keep API contracts and behavior untouched. This is a UI-only change.
- `npm run build`, `npx tsc -b`, `npx eslint`, `npm test`, `npx playwright test`
  must pass; axe on `/`, `/me`, `/leaderboard` must stay clean.

## 10. Refusals (0 AI slop)

No gradient text or backgrounds, no glass/blur decoration, no emoji or Unicode
glyph icons (draw SVG icons in one stroke weight), no icon+title+text card grids
as page structure, no kicker/eyebrow labels, no section numbers, no hard offset
shadows, no colored `border-left` above 1px, no purple, no stock illustrations,
no "AI-powered ✨" copy, no uniform per-section entrance animations.
