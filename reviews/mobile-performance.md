# Mobile + Performance Review — Ship60

Reviewer: mobile/performance workstream. Read-only review; all measurements run
from `/tmp/ship60-perf`, no repo files changed except this report.

## Method

- `npm run build` (tsc -b && vite build) analysed from `dist/ship60`/`dist/client`.
- Production `dist/client` served through a local Brotli static server (mimics
  Cloudflare transport, same approach as DECISIONS D3.10) with `/api`, `/og`,
  `/r`, `/cert` proxied to `vite dev` (real local D1/KV/DO). Intentionally
  HTTP/1.1 + ~1–4 ms TTFB, so results are conservative on parallelism but
  optimistic on origin latency.
- Playwright 1.63 (Chromium), 390×844, DSF 3, mobile+touch, **Fast 3G**
  (1.6 Mbps down / 750 Kbps up / 150 ms RTT) + **4× CPU throttling**; LCP/FCP/
  CLS/long tasks via PerformanceObserver, plus `PerformanceResourceTiming`.
- Screenshots: `/tmp/ship60-perf/01-landing-3g.png` … `09-admin-loggedin-3g.png`;
  raw data in `/tmp/ship60-perf/results.json`, `cold-results.json`.
- Lighthouse CLI is not installed (no installs allowed); DECISIONS D3.10's
  recorded Lighthouse run (98/100/100/91 on production compression) is cited,
  not re-verified.

## Summary (measured)

Fast 3G + 4× CPU, cold cache, 390×844:

| Route | FCP | LCP | CLS | JS transferred (Brotli) |
|---|---|---|---|---|
| `/` | 908 ms | **1 244 ms** | 0.0247 | 91.9 KB |
| `/me` | 824 ms | 1 356 ms | 0.0003 | 84.0 KB |
| `/leaderboard` | 828 ms | 1 128 ms | 0.0140 | 81.1 KB |
| `/live` | 828 ms | 1 128 ms | 0.0001 | 81.1 KB |
| `/submit` | 824 ms | 1 132 ms | 0.0000 | 80.2 KB |
| `/admin` (login) | 824 ms | 1 296 ms | 0.0000 | 87.6 KB (+87.4 KB PacingChart after login) |

- **Initial JS for landing = 106.9 KB gzip** (Vite: index 87.70 + react 3.04 +
  jsx-runtime 0.66 + LandingPage 12.06 + useQuery 2.99 + constants 0.49) —
  under the PRD §7 150 KB budget. Entry chunk contains react-dom, react-router,
  @tanstack/query-core, App, main only (sourcemap check; no zod/recharts/live).
- Landing waterfall: entry JS 206→785 ms, CSS 208→456 ms, LandingPage chunk
  866→1135 ms, fonts start 876 ms (Atkinson) / 1197 ms (Archivo, 690 ms),
  no images at all. LCP element = `<h1>` (`Hero.tsx:39`).
- Repeat visit with Cloudflare's default asset headers: LCP 692 ms, 7×304 asset
  revalidations, fonts served from cache.
- Every route at 390×844: `scrollWidth == clientWidth == 390` (no horizontal
  overflow); long-task totals 0–115 ms (landing) → TBT well under 200 ms.

Verdict: **LCP and bundle budgets pass** with comfortable margins. The main
gaps are an in-app-browser download fallback, font-swap CLS, and two low-impact
delivery hygiene items.

## Findings

### Critical

None.

### High

**H1 — Story-image download has no fallback for WhatsApp/Instagram in-app browsers.**
- Evidence: `/me` and `/ambassador/:code` expose the story PNG only through an
  `<a href="/og/:code/story.png" download="…">` — `LaunchpadPage.tsx:201-208`,
  `AmbassadorPage.tsx:105-108`. The server response is bare PNG with no
  `Content-Disposition` (`og.ts:320-331`; `curl -I /og/PERF4/story.png` →
  `content-type: image/png`, no disposition). There is no `navigator.share`/
  `canShare` use anywhere in `src/client` and no "long-press to save" hint.
- Impact: iOS WhatsApp/Instagram in-app browsers are WKWebView-based and ignore
  the `download` attribute unless the host app implements `WKDownloadDelegate`;
  Android in-app WebViews commonly no-op without a `DownloadListener`. The
  "Download story image for Instagram" flow (PRD M3, ambassador loop) silently
  fails in exactly the environments PRD §7 calls out. Not reproducible in this
  environment (no IG/WA WebView); evidence is code + headers + platform
  behaviour.
- Fix: when `navigator.canShare({ files })`, fetch the PNG and call
  `navigator.share`; otherwise open the PNG and show a visible "long-press to
  save" hint. Adding `Content-Disposition: attachment` helps desktop/Android
  browsers but does not rescue iOS WKWebView.

### Medium

**M1 — Brand/body fonts start too late: visible FOUT and a 0.024 layout shift on landing.**
- Evidence: cold landing has `atkinson-regular` at 876 ms, `archivo-latin.woff2`
  (90 396 B) only requested at 1197 ms and finishing ~1887 ms; the `h1` first
  paints in the system fallback, then a shift of **0.0243 at 1902 ms** pushes
  the fieldsets/copy (`cold-results.json`, screenshot 01). `/leaderboard` shows
  0.0140 the same way. Adding `<link rel="preload" as="font" crossorigin>` for
  `archivo-latin.woff2` + `atkinson-regular-latin.woff2` (route-interception
  test only, no repo change) moved CLS **0.0247 → 0.0004**, at a cost of +40 ms
  LCP (1368→1408 ms) — both far inside budget. Archivo is a 90 KB variable font
  (wdth 62–125, wght 100–900) used only for display headings
  (`tokens.css:15-39`).
- Impact: a visible reflow ~2 s into the primary landing route on Fast 3G, plus
  the LCP headline renders in system UI font for ~0.6 s. LCP budget itself is
  still met.
- Fix: preload the two latin fonts (measured win), and/or subset Archivo to the
  used weights/width. Optionally add `size-adjust`/metric overrides to the
  fallback to remove the shift without preloading.

### Low

**L1 — Hashed assets are served `max-age=0, must-revalidate` (no `_headers`).**
- Evidence: no `_headers`/`_routes` file in repo or `dist/client` (`.assetsignore`
  only excludes `wrangler.json`, `.dev.vars`); Cloudflare Static Assets default is
  `Cache-Control: public, max-age=0, must-revalidate` (verified in workers-sdk
  `workers-shared/asset-worker/src/constants.ts`, Context7). Repeat visit
  measured 7×304 revalidation requests before reuse.
- Impact: every repeat visit (reopening the WhatsApp link, revisiting
  `/leaderboard` or `/me`) pays revalidation RTTs; measured repeat LCP 692 ms so
  real-user impact is small. Fix: add `_headers` with
  `/assets/*` + `/fonts/*` → `Cache-Control: public, max-age=31536000, immutable`,
  keep HTML revalidating.

**L2 — Production source maps are published (3.9 MB of `.map` in `dist/client`).**
- Evidence: `vite.config.ts:21-23` sets `build.sourcemap: true`; `.assetsignore`
  does not exclude `*.map`; `PacingChart-CBvekft0.js.map` alone is 1.99 MB and
  total client maps 3.9 MB, all served by Static Assets.
- Impact: no normal-browsing network cost (browsers fetch maps only with
  DevTools open), but it inflates the deployed asset set and exposes full
  unminified source/comments publicly. Fix: disable client sourcemaps for
  production or add `*.map` to `.assetsignore`.

## Verified good

- **Bundle budget / code splitting:** initial landing JS 106.9 KB gzip (< 150 KB);
  every page lazy in `App.tsx:4-14`; `/admin` logs in with 87.6 KB, then loads
  `PacingChart` (recharts, 105.8 KB gzip) only after login at ~4.1 s; `/live`
  page 2.12 KB gzip; landing waterfall contains no recharts/admin/live/zod code.
  Recharts is also lazily imported inside the admin sections (`sections.tsx:17`).
- **LCP:** 1.24–1.37 s cold on Fast 3G + 4× CPU for `/` (PRD target < 2 s);
  hero is text, zero `<img>` elements in the whole client.
- **Layout at 390×844:** no horizontal overflow on `/`, `/me`, `/leaderboard`,
  `/live`, `/admin` (incl. post-login chart/tables) or `/submit`; screenshots
  01–09.
- **In-app safety (other than H1):** no `window.open`/popups anywhere; share
  links are anchors with `rel="noopener noreferrer"`; copy uses
  `navigator.clipboard` with a `textarea` + `execCommand("copy")` fallback
  (`me/ui.tsx:110-127`); `.ics` is served `Content-Disposition: attachment`;
  Turnstile is IntersectionObserver-lazy (`RegistrationForm.tsx:110-123`) and no
  challenge request fires on landing load.
- **No wasted network on first paint:** `/api/ideas/preview` is not requested
  until a chip is tapped; only `/api/stats/public` (60 s refetch,
  `useStats.ts:9`) and the analytics beacon fire on load.
- **Fonts:** `unicode-range` subsets work — only latin files fetched; non-landing
  routes pull 22.6 KB (Atkinson only), Archivo never requested.
- **Motion/accessibility:** `prefers-reduced-motion` zeroes animations
  (`tokens.css:165-175`); countdown uses `tabular-nums` to avoid jitter.
