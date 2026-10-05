# 03-SUMMARY — Redesign C: admin war room, /plan deck, /build notes

**Status:** done — all verifications green; screenshots at 390×844 and 1440×900
inspected; print deck produces exactly 5 pages.

## Files

Owned paths only (no shared files touched):

| File | Change |
|---|---|
| `src/client/pages/admin/AdminPage.tsx` | Rewritten: command bar + sticky simulated rail, stat ruler, console grid, airlock login |
| `src/client/pages/admin/parts.tsx` | New: `Section`, responsive `DataTable`, `StatusText`, compact-button class |
| `src/client/pages/admin/sections.tsx` | Rewritten: all war-room sections on hairlines; flags rows with approve/reject; dense tables |
| `src/client/pages/admin/PacingChart.tsx` | Rewritten: hairline grid, signal actual line, dashed plan, today marker, custom dark tooltip |
| `src/client/pages/admin/theme.ts` | Deleted: no local class bridge; design tokens/components are used directly |
| `src/client/pages/plan/PlanPage.tsx` | Rewritten: full-viewport slides, segmented bar nav, centered progress rail, print CSS, one slide-in moment |
| `src/client/pages/plan/slides.tsx` | Rewritten: display-scale statements, hairline data rows, signal-accented channel stack, target-500 chart |
| `src/client/pages/plan/theme.ts` | Deleted: styles inlined per component |
| `src/client/pages/build/BuildPage.tsx` | Rewritten: responsive inline SVG architecture, structured asked→AI→rejected rows, DECISIONS.md parsed into hairline field rows |

`src/client/pages/plan/deck.ts` unchanged. No `design/*`, `shared/*`, `worker/*`,
or config edits.

## Commands and results

| Command | Result |
|---|---|
| `npx tsc -b` | clean |
| `npx eslint src/client/pages/admin src/client/pages/plan src/client/pages/build` | clean |
| `npm run build` | success (vite build, postbuild OK) |
| `npx playwright test tests/e2e/plan.spec.ts tests/e2e/admin.spec.ts` | 3 passed (plan desktop + mobile, admin desktop) |
| Print layout under `emulateMedia("print")` | 5 slides `display:block`, heights 314/438/451/439/431 px (page 733 px) |
| `plan-print.pdf` page count | 5 (A4 landscape, `format` + `preferCSSPageSize`) |

`data-testid` preserved: `admin-password`, `admin-login`, `admin-overview`,
`pacing-chart`, `flags-queue`, `plan-slide`. Copy that tests assert is unchanged
("Sign in", "Generate brief", "Next", segment/channel/budget text, Simulated data).

## Screenshots (all in `/tmp/ship60-redesign-C/`)

`admin-login-1440.png`, `admin-login-390.png`, `admin-1440.png`,
`admin-mid-1440.png`, `admin-bottom-1440.png`, `admin-full-1440.png`,
`admin-390.png`, `admin-mid-390.png`, `plan-1440.png`, `plan-390.png`,
`build-1440.png`, `build-390.png`, `plan-print.pdf` (5 pages).
No horizontal scroll on any of the three routes at 390 px.

## Decisions

1. **Admin is a console, not a card grid.** Sections are separated by hairlines
   (title + mono meta + rule); only the chart sits in a panel. Tables carry the
   density, numeric columns are mono right-aligned with tabular numerals, and
   mobile collapses every table to label:value rows.
2. **Signal economy.** Lime is reserved for Sign in, Create ambassador, Next,
   data bars/lines and the seat. Refresh/Log out/replay/export are secondary or
   ghost; approve/reject use hairline and danger-ghost buttons.
3. **Honesty in place.** The persistent sticky rail keeps the SimulatedBadge,
   the row count and the include/exclude toggle visible; the pacing meta gains
   the full SimulatedBadge whenever simulated rows are in view.
4. **Chart restyle:** hand-built legend in the section head, `ReferenceLine` for
   today, `isAnimationActive={false}` for calm, custom surface-3 tooltip, no
   default palette anywhere.
5. **Plan deck:** one authored moment (260 ms slide-in), bar indicators with
   44 px tap targets, swipe requires a horizontal-dominant gesture, navy print
   palette flips from the same variables; chart is inline SVG with a target-500
   reference so no chart library ships on /plan.
6. **Build:** DECISIONS.md is parsed per entry into `**Label:** value` hairline
   rows (numbered WS5 items and unlabelled bullets degrade to prose rows);
   architecture is two inline SVGs (wide + portrait) in one stroke weight with
   signal only on the request path.
7. Fixed a real bug found while inspecting: long code tokens in the decision log
   caused 5 px of horizontal overflow at 390 px; code chips now use
   `overflow-wrap:anywhere`.

## Requests

None. Agent A's `src/client/design/` components and tokens were consumed
unchanged (`Button`, `Chip`, `Input`, `Select`, `SimulatedBadge`, `buttonClass`).

## Honest limitations

- Local D1 has no flag rows, so the desktop flags table rendered its empty state
  in the screenshots; Approve/Reject styling is typechecked and built but was not
  visually exercised with data.
- The 8-page artifact produced by headless `page.pdf()` without an explicit
  `format` is a Playwright `preferCSSPageSize` quirk; with `format:"A4",
  landscape` (and in a real Cmd+P) the deck is 5 pages.
- Worker/Vitest suites were not re-run (UI-only change); `npm run build` and the
  two requested e2e specs passed.
