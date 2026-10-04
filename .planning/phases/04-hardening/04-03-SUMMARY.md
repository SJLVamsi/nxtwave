# 04-03 Summary — client UX/perf hardening + static headers

**Status:** complete. All five tasks implemented and verified locally against the
live dev server (including the orchestrator's in-flight 409 `DUPLICATE` change,
which landed mid-session).

## Files changed

- `src/client/pages/landing/Hero.tsx` — project card scrolls into view when it renders on mobile (skipped when already visible; honours `prefers-reduced-motion`).
- `src/client/pages/landing/RegistrationForm.tsx` — per-field errors clear on edit, submit banner clears on the next edit; duplicate panel copy rewritten (no "link was sent" promise, links `/me` when the 409 carries no URL).
- `src/client/pages/me/story.ts` — new DOM helper: `navigator.share({files})` when `canShare` supports files → anchor download → new-tab open; used by Launchpad and Ambassador.
- `src/client/pages/me/LaunchpadPage.tsx`, `src/client/pages/ambassador/AmbassadorPage.tsx` — story button wired to the helper + visible "Long-press the image to save it." hint.
- `public/_headers` — CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, immutable `/assets/*` caching (verbatim from the plan).
- `index.html` — preload `/fonts/archivo-latin.woff2` (weight used by the hero `h1` via `font-display`; exact file from `design/tokens.css`).
- `vite.config.ts` — `build.sourcemap` only when `SHIP60_SOURCEMAPS === "1"`.
- `src/client/pages/admin/sections.tsx`, `AdminPage.tsx` — `/60` and `/50` muted text raised to full `#2E333B`; funnel conversion `opacity-60` (3.7:1) and tinted red badges (4.1:1) given AA-safe colours.
- `src/client/pages/plan/slides.tsx`, `PlanPage.tsx` — removed all-caps/tracking-widest eyebrow labels and table head; helper text `#6E7BA6` → `#5A6472` (M8).
- `src/client/pages/build/BuildPage.tsx` — new top section "What we asked AI, what it suggested, what we rejected" (P0.2 Vitest plugin, P0.5 model ids, WS4.1 OG fonts) rendered with the existing markdown component; scrollable regions made keyboard-focusable; M8 colour fix.
- `src/client/pages/cert/CertPage.tsx` — visible "Simulated data" badge when `data.isSimulated` is true.

## Commands and results

- `npm run build` → clean; `dist/client/_headers` present; `dist/client/assets` contains **0** `.map` files; built `index.html` carries the Archivo preload.
- `npx playwright test` → **12 passed** (mobile + desktop: axe `/`, `/me`, `/leaderboard`; admin login; plan; core loop).
- `npm test` → **8 files, 122 tests passed**.
- `npx eslint` on every owned path → 0 errors (one pre-existing fast-refresh warning in `landing/Sections.tsx`).
- Live browser checks (Playwright, 390×844): card/control bottom y=758 inside 844 after both chips; empty-submit error count 1 → 0 after typing a name; real 409 duplicate through the UI shows the new copy, old "link was sent" copy count 0, `Open my Launchpad` href `/me`; story click fires a `ship60-…-story.png` download and the hint is visible.
- Axe on `/admin` after login: 52 serious contrast nodes → **0 violations** (a second pass fixed the funnel `opacity-60` and tinted red badges). `/plan`, `/leaderboard`, `/build` also 0 serious/critical.

## Decisions

1. **Scroll condition.** The effect scrolls only when the card is not fully in the viewport, so desktop's sticky column stays put while the 390×844 case scrolls; `scrollBehavior` is `auto` under reduced motion.
2. **DOM helper placement.** `saveStoryImage` lives in a new `me/story.ts`, not `share.ts`, because `share.ts` is imported by the Workers Vitest pool (`tests/worker/og.test.ts`) and that tsconfig has no DOM lib (WS4.4 contract).
3. **Hint is static.** The "Long-press the image to save it." line is always visible next to the button (plan asks for no popup); the new-tab path is the last resort when even `download` is unsupported.
4. **Admin contrast.** Muted labels went to full `#2E333B` (not just `/70`) to clear axe with a margin; the "No ambassador yet" badge uses `#B01731` on its tinted background to keep the warning hue at AA.
5. **Cert badge.** The client renders the badge from `CertificateResponse.isSimulated`, which the contract already allows; `loadCertificate` does not currently set it (WS7 file, not touched), so the badge activates when that field is returned.
6. **No dependency or other shared-file edits.** `src/shared/*`, `src/worker/*`, `package.json`, `wrangler.jsonc`, `design/*` untouched.

## Notes

- An intermediate `tsc -b` failed on unused imports in `tests/worker/admin.test.ts` (orchestrator-owned, mid-write). A temporary local patch let verification proceed; the orchestrator then landed the finished file with the imports in use, and the repo now contains that version (verified `npm run typecheck` clean, no restoration needed).
- Not in this plan's scope, left for owners: `og.ts` idea-key parsing (ux-copy C1), `me/ui.tsx` dark-mode tokens (M7), FOMO rank copy (H6), cert SSR simulated mark, stale `.assetsignore` maps (now moot since maps are not emitted).
