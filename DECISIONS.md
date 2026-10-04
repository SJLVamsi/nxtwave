# DECISIONS.md — decision log

Format per entry: **Context → Options considered → Choice → Why → Rejected.**
Subagents append under their workstream heading. This file feeds the submission's
"what did AI suggest that you rejected" answer, so record real alternatives.

## Phase 0 — orchestrator

### P0.1 Scaffold and toolchain
- **Context:** PRD §6.1 asks for React + Vite + Hono on Workers Static Assets with TypeScript strict.
- **Options:** (a) C3 React template, (b) manual Vite + Cloudflare plugin setup, (c) Next.js on Workers.
- **Choice:** C3 `--framework=react --platform=workers --variant=react-ts`, then restructured `worker/` → `src/worker/` to match PRD §6.2.
- **Why:** Official template pins current compatible versions (Vite 8, `@cloudflare/vite-plugin` 1.62, Wrangler 4.147, TS 6).
- **Rejected:** Next.js — heavier than needed for an SPA + API and the PRD names React Router.

### P0.2 Vitest integration (platform fact verified, differs from PRD §6.1)
- **Context:** PRD names `@cloudflare/vitest-pool-workers`; the current docs (Aug 2026) describe `@cloudflare/vitest-plugin` with the `cloudflareTest()` Vite plugin, and the old package's peer range lags Vitest 5.
- **Options:** (a) old pool package + `defineWorkersConfig`, (b) new `@cloudflare/vitest-plugin` 1.3.6.
- **Choice:** new plugin, `remoteBindings: false`, `wrangler.configPath`, `readD1Migrations` + `applyD1Migrations` in `tests/setup.ts`.
- **Why:** Current supported path; fully local; same `cloudflare:test` APIs.
- **Rejected:** `@cloudflare/vitest-pool-workers` — would pin Vitest 4 while the template ships Vitest 4.1; the new plugin is the documented successor.

### P0.3 Linter
- **Context:** C3 template ships `oxlint`; MASTER_PROMPT Phase 0 says ESLint + Prettier.
- **Options:** (a) keep oxlint, (b) ESLint 10 + typescript-eslint 8 + Prettier.
- **Choice:** ESLint flat config + Prettier, removed oxlint.
- **Why:** Follows the plan; typescript-eslint 8.71 supports ESLint 10 and TS 6.
- **Rejected:** Running both linters — duplicate tooling for no benefit.

### P0.4 Durable Object migrations
- **Context:** Current Wrangler docs say the declarative `exports` field is preferred for new Workers; legacy `migrations` still supported.
- **Choice:** legacy `migrations` with `new_sqlite_classes: ["LiveRoom"]` exactly as PRD §6.3 specifies.
- **Why:** Matches the PRD and every current DO example; no functional difference for one class.
- **Rejected:** `exports` field — would diverge from the PRD for no gain.

### P0.5 Workers AI model ids (platform fact verified)
- **Context:** PRD §6.6 suggests `@cf/meta/llama-3.1-8b-instruct` and `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, "verify against the current model catalog".
- **Choice:** `@cf/meta/llama-3.1-8b-instruct-fast` for ideas/brief and `@cf/meta/llama-3.3-70b-instruct-fp8-fast` for the evaluator (both confirmed in the Oct 2026 catalog).
- **Why:** The `-fast` variant lowers idea latency; 4 s timeout budget matters on mobile.
- **Rejected:** Larger Llama 4 models — more neurons per call with no measured quality need for a 3-field JSON card.

### P0.6 Extra D1 indexes (beyond PRD §6.4)
- `idx_colleges_name` — typeahead `LIKE` scan.
- `idx_events_created` — pacing/funnel queries filter by day, not type.
- `idx_users_flag_status` — admin flags queue.
- `idx_checkins_workshop` — attendance counts per workshop.
- `idx_submissions_user` — launchpad submission lookup.
- **Why:** Each backs a query the PRD's UI performs; all are cheap on D1.

### P0.7 Workshop schedule
- **Context:** PRD says Day 7, Sunday 7:00 PM; build date is 2026-10-04.
- **Choice:** `WORKSHOP_ID=ship60-2026-10-11`, `WORKSHOP_START_ISO=2026-10-11T13:30:00.000Z` (19:00 IST).
- **Rejected:** Leaving the date empty — the countdown, `.ics` and pacing chart all need it.

### P0.8 Static idea bank size
- **Context:** MASTER_PROMPT Phase 0 asks for ≥ 48 ideas, "6 branches × 8 interests, one each minimum".
- **Choice:** exactly one hand-written idea per branch × interest (48), served when AI fails.
- **Why:** Covers every combination with a verified buildable idea; the AI path supplies variant diversity (3 per combo).
- **Rejected:** 144 static ideas — triples content volume for a fallback path that should rarely trigger.

### P0.9 Same-origin API only
- **Context:** SPA and API share one Worker.
- **Choice:** no CORS layer; cookies are SameSite=Lax, HttpOnly, Secure.
- **Why:** No third-party origins need API access; CORS would only widen the attack surface.

## WS1

### WS1.1 Referral precedence at register: first-touch cookie wins
- **Options:** (a) body first (last touch wins), (b) cookie first when it resolves to a real user, then body, (c) overwrite cookie on every landing.
- **Choice:** `/r/:code` never overwrites an existing `s60_ref` and redirects with the existing code; register prefers a resolvable cookie, then body `refCode`.
- **Why:** literal first-touch attribution, consistent landing→register; a second click cannot steal credit.
- **Rejected:** (a) breaks first-touch; (c) re-attributes sessions on every click.

### WS1.2 Velocity flag is the 6th registration from an IP hash
- **Options:** (a) raise the 5/h rate limit so the 6th passes and only flags, (b) keep 5/h and flag when 5 same-IP rows exist in the last hour, (c) count flags in KV.
- **Choice:** (b) — the incoming 6th registration is flagged `ip_velocity`/`open`.
- **Why:** both the 429 path and the flag path fire as specified; D1 is durable.
- **Rejected:** (a) removes the tested 429; (c) loses history.

### WS1.3 Duplicate lookup is email-first; unknown college degrades to "Other"
- **Options:** (a) error `CONFLICT` on mixed identities/unknown college, (b) return the email match and treat a missing college as other/null.
- **Choice:** (b) — duplicates never error (PRD M1); only schema/Turnstile failures reject.
- **Why:** registration must never dead-end at 30 seconds.
- **Rejected:** (a) leaks that both identifiers exist and blocks stale-id cases.

### WS1.4 `tierIndex` = number of unlocked tiers, per tier basis
- **Choice:** tiers 1/2 compare against total referrals, tier 3 against qualified; `nextTierAt`/`nextTierLabel` from the first locked tier.
- **Rejected:** 0-based current-tier index — off-by-one semantics and could show the certificate on pending referrals.

### WS1.5 `/r/:code` ships its own CSP for the inline redirect
- **Options:** (a) 302, (b) external script, (c) per-page CSP with `script-src 'unsafe-inline'` + `<noscript>` meta-refresh fallback.
- **Choice:** (c); `securityHeaders` only fills CSP when absent.
- **Why:** OG crawlers get tags, browsers redirect instantly, works in in-app browsers; URL is JSON-escaped (`\u003c`).
- **Rejected:** (a) breaks rich previews; (b) adds a bundle for one line.

### WS1.6 Variant capture validates `en|te|fomo`; simulated referrers excluded
- **Choice:** unknown `v` becomes null; referrer lookup filters `is_simulated = 0`.
- **Why:** clean variant stats, no injection surface, no real referrals crediting fake users (rule 5).
- **Rejected:** raw `v` storage; letting simulated users refer real users.

### WS1.7 Idea resolution from `idea_key` without a schema change
- **Choice:** `lib/idea-card.ts` resolves `branch|interest[|variant]` through `IDEA_BANK` and also accepts a stored JSON card.
- **Why:** works with the frozen schema and both plausible key formats.
- **Rejected:** a migration for a derivable value.

### WS1.8 Tests reset D1/KV in `beforeEach`
- **Context:** the Vitest plugin isolates storage per file, not per test.
- **Choice:** per-test cleanup inside the WS1 test file (no shared-config edit).
- **Rejected:** editing `vitest.config.ts`; brittle relative assertions.

## WS2

### WS2.1 Deterministic variant when the request omits `variant`
- **Context:** The contract makes `variant` optional; the brief wants repeat visits to keep the same card while different students see variety.
- **Options:** (a) random variant per request, (b) server session/cookie set by the Worker, (c) FNV-1a hash mod 3 of an anon seed: `x-anon-id` header, else the `s60_anon` cookie, else the IP.
- **Choice:** (c).
- **Why:** No session store; stable for one visitor, varied across visitors; WS3 can pass the anon id it already uses for analytics.
- **Rejected:** (a) flickers on refresh and can trigger three AI calls per visit; (b) needs a new cookie/state the contract does not define.

### WS2.2 Rate-limit granularity for idea generation
- **Context:** The brief requires `RATE_LIMITS.ideas` (30/h) by IP hash, but `warm-ideas.ts` must generate all 144 combinations from one IP in a single run, and Phase 4 runs `--remote` the same way.
- **Options:** (a) per-IP global on every request, (b) per-IP global on cache misses only, (c) per-IP+combination on cache misses, (d) no limiter.
- **Choice:** (c): key `idea:{ipHash}:{branch}:{interest}`, checked only when about to call AI.
- **Why:** A full warm does only 3 misses per combination so it passes, while a retry storm on one card is capped at 30 generations/hour. The global KV cache already bounds total idea generations to 144 per 30-day TTL, so the limiter's real job is stampede/outage protection; cache hits cost nothing and are never counted.
- **Rejected:** (a)/(b) make the mandated single-IP 144 warm impossible (30 < 144) and would throttle legitimate "show me another"; (d) ignores the brief.

### WS2.3 Bank fallbacks cached for 1 hour
- **Context:** The brief says cache bank fallbacks with a short TTL so AI can retry later.
- **Choice:** AI cards use `IDEA_CACHE_SECONDS` (30 days); bank cards use `BANK_CACHE_SECONDS = 3600`.
- **Why:** Matches the PRD's bounded-generation design and heals automatically within an hour of an AI outage.
- **Rejected:** Not caching bank cards (every request retries AI, exactly what a rate limit would then block); caching bank for 30 days (AI would never be retried).

### WS2.4 Quality filter implementation
- **Context:** Reject generated ideas that need a paid API, hardware, or more than 60 minutes.
- **Options:** (a) second LLM call as judge, (b) keyword + tool checks over all card text, (c) keyword checks only on the `tools` array.
- **Choice:** (b) in `src/worker/lib/ideas/quality.ts`, returning `paid-api | hardware | over-60-minutes`; the tool list is part of the checked text.
- **Why:** Deterministic, free, unit-testable, and a false positive only costs a hand-checked bank idea.
- **Rejected:** (a) doubles latency/cost and adds another failure mode; (c) misses paid APIs mentioned in steps. Also rejected rejecting any "days" mention: content can span days (e.g. a 7-day sleep plan) while the build stays under 60 minutes, so only explicit build-time phrases count.

### WS2.5 `IdeaCard.key` format
- **Context:** The contract requires `key`; registration stores `ideaKey`; WS1/WS4 may need to reconstruct the idea later.
- **Choice:** `idea:{branch}:{interest}:{variant}` — identical to the KV cache key.
- **Why:** Reconstructible from the fields a user row stores, and unique across the three variants.
- **Rejected:** The bank key `{branch}|{interest}` — loses the variant and would collide across AI variants.

### WS2.6 `warm-ideas.ts --remote` base URL
- **Context:** No deployed URL exists at build time, yet Phase 4 runs `npx tsx scripts/warm-ideas.ts --remote`.
- **Choice:** `--remote` requires `--url` or `SHIP60_BASE_URL` and fails loudly if only the localhost `PUBLIC_BASE_URL` is available. Success = every attempted combination succeeded; `--limit N` caps combinations for smoke runs.
- **Why:** Keeps the script deploy-agnostic with no hardcoded workers.dev subdomain.
- **Rejected:** Shelling out to `wrangler deployments` (auth-dependent, brittle output parsing); hardcoding a URL (wrong per environment).
- **Request:** Orchestrator passes `--url` or sets `SHIP60_BASE_URL` in Phase 4.

### WS2.7 Verification workaround: WS1 catch-all shadows sibling `/api` routes
- **Context:** `src/worker/routes/public.ts:711` ends with `app.all("*", …)` and is mounted at `/api` before `/api/ideas` in `index.ts`, so in the assembled Worker `POST /api/ideas/preview` returns WS1's 404 ("No such public API route"). Verified empirically on a dev server.
- **Options:** (a) edit `public.ts`/`index.ts` (not WS2-owned), (b) stop and wait, (c) verify with a temporary local harness and log a TASKS.md request.
- **Choice:** (c): a temp Vite config outside the repo (`remoteBindings: false`, public routes aliased to a stub) let the route and `warm-ideas.ts` be exercised end-to-end without touching WS1 files.
- **Why:** Keeps ownership rules while producing real HTTP evidence for the WS2 done criteria.
- **Rejected:** (a) cross-workstream edits; (b) blocking WS2 on another workstream's fix.
- **Request:** WS1 should replace the catch-all with `app.notFound(...)` or drop it; until then admin/live/submissions routes are shadowed too.

### WS2.8 Local warm produced bank cards only (no `wrangler login`)
- **Context:** Workers AI is a remote binding; this environment is not authenticated, and `npm run dev`/`wrangler dev` refuse to start the remote AI proxy without `CLOUDFLARE_API_TOKEN` or an interactive login.
- **Choice:** The AI path is covered by unit tests with a mocked `AI.run`; the live warm run was executed against a local dev server with `remoteBindings: false`, so all 9 sampled combinations fell back to `source: "bank"`.
- **Why:** Honest verification without asking the human to log in during Phase 2; the same script and endpoint will generate AI cards after login in Phase 4.
- **Rejected:** Faking an AI success in the warm output; editing `wrangler.jsonc`/`vite.config.ts` (orchestrator-owned) to force local AI.

## WS3

### D3.1 Design tokens bridged into Tailwind v4
- **Context:** PRD §5 fixes the palette and requires dark mode via `prefers-color-scheme`; every workstream consumes `design/`.
- **Options:** (a) plain CSS variables + hand-written component CSS, (b) `@theme` with static values + `dark:` variants, (c) `@theme inline { --color-x: var(--x) }` over `:root` variables that a media query overrides.
- **Choice:** (c). Palette lives in `tokens.css` as `--paper`/`--ink`/… with a `prefers-color-scheme: dark` override; Tailwind theme aliases them with `@theme inline`; `ruled` paper lines via `@utility`.
- **Why:** utilities (`bg-paper`, `text-graphite`, `border-rule`) follow the scheme with no `dark:` duplication; verified in built CSS (`var(--paper)` and `font-stretch:125%` present).
- **Rejected:** `dark:` class strategy (needs a toggle/class and doubles every utility); static `@theme` values (cannot switch).

### D3.2 Fonts self-hosted, minimal subsets
- **Context:** Archivo variable (expanded width for display) + Atkinson Hyperlegible (body/forms), no npm packages, no CDN dependency.
- **Options:** (a) Google Fonts CSS link, (b) npm `@fontsource`, (c) curl the woff2 subsets into `public/fonts/` and declare `@font-face`.
- **Choice:** (c): Archivo variable latin + latin-ext (wdth 62–125, wght 100–900), Atkinson 400/700 latin + latin-ext; Vietnamese and italics skipped. `font-display: swap`.
- **Why:** AGENTS rule 3 (no subagent installs) and §7 (no third-party origins, works offline in dev); display headlines use `font-stretch-expanded` (125%).
- **Rejected:** `@fontsource` (npm dependency for files we can download), Google CDN (extra origin, no offline).

### D3.3 Idea preview client flow
- **Context:** Hero = the project preview; two chip groups; variant cycling 0→1→2; WS2 may be stubbed during the build.
- **Options:** (a) manual fetch with effects and loading state, (b) TanStack Query keyed per combination, (c) client-side fallback to `idea-bank.ts` when the API fails.
- **Choice:** (b), `["idea", branch, interest, variant]`, `staleTime: Infinity`, abort via query signal; on error the card area shows a retry state. No client-side bank.
- **Why:** TanStack Query already ships for stats; cached variants make "Show me another" instant after first load; keeps the landing chunk ~12 KB gzip.
- **Rejected:** (c) duplicates the server's documented bank fallback and adds ~18 KB to the critical route; (a) more state code and race handling.

### D3.4 Turnstile site key and lazy loading
- **Context:** `TURNSTILE_SITE_KEY` is a Worker var, not visible to the client bundle.
- **Options:** (a) hardcode the production key (unknown), (b) add `GET /api/config`, (c) `import.meta.env.VITE_TURNSTILE_SITE_KEY` with fallback to the public dev test key in `wrangler.jsonc`.
- **Choice:** (c) with fallback `1x00000000000000000000AA`; script loaded via IntersectionObserver 400 px before the form, explicit render, theme follows the colour scheme, widget removed on unmount.
- **Why:** works today in dev and activates a real key as soon as the orchestrator exposes one; no extra API surface.
- **Rejected:** (b) a network round trip and a new public route for one public string — filed as a request instead.

### D3.5 Registration and duplicate handling
- **Context:** Inline form must match `RegisterRequestSchema`, survive in-app browsers, and show the existing Launchpad on duplicate instead of an error.
- **Options:** (a) rely on server errors only, (b) client validation + defensive duplicate parsing.
- **Choice:** (b): client checks name/email/+91 phone/college/branch/consent before POST; phone normalised to `+91XXXXXXXXXX`; `ideaKey`, `refCode`, `shareVariant` and UTM params included. On `DUPLICATE`, link to `launchpadUrl` from the error body (top level or under `error`), else a URL found in the message, else `/me`. On success: seat ticket moment ~2.6 s then `navigate("/me?t=TOKEN")` with an immediate button.
- **Why:** PRD M1 acceptance says duplicates get the Launchpad link; WS1 currently returns 200 `isReturning` for phone/email matches, so both paths work.
- **Rejected:** blocking the success moment on the timer alone (no way to skip); a `/api/register/lookup` pre-check (extra endpoint, more PII surface).

### D3.6 Analytics without a provider
- **Context:** `page_view`, `idea_generated`, `form_started`, `registered`; `s60_anon` cookie; `EventRequestSchema` has no ref/variant fields.
- **Choice:** fire-and-forget `fetch` with `keepalive`, anon id in a readable (non-HttpOnly) `s60_anon` cookie for 365 days, ref/variant in `props`; `page_view` guarded by a module flag for StrictMode.
- **Why:** no React provider wiring in orchestrator-owned `App.tsx`; a failed beacon can never break the page.
- **Rejected:** HttpOnly anon cookie (client could not send it), awaiting responses (adds latency to every interaction).

### D3.7 The single orchestrated moment
- **Context:** PRD §5 allows one animation: the project card being "written".
- **Choice:** per-line clip-path wipe (`--animate-written`) with a 110 ms stagger, keyed remount per variant; everything else static. The global `prefers-reduced-motion` override zeroes `animation-delay` as well as duration — testing showed that zeroing duration alone left the stagger visible (opacity stayed 0 during the inline delay).
- **Rejected:** scroll-triggered entrance animations (PRD forbids), JS typewriter (more code, layout jank).

### D3.8 College list response shape
- **Context:** contracts has `CollegeOptionSchema` but no list wrapper; `GET /api/colleges?q=` currently returns a bare array.
- **Choice:** client accepts both a bare array and `{ colleges: [...] }` and normalises.
- **Why:** unblocks integration without guessing; a `CollegeListResponseSchema` request is filed.
- **Rejected:** assuming one shape and breaking when WS1 finalises.

### D3.9 Local dev needs remote bindings off
- **Context:** `npm run dev` fails with "Establishing remote connection … CLOUDFLARE_API_TOKEN" because the Vite plugin defaults `remoteBindings: true` (AI binding cannot be simulated locally).
- **Options:** (a) ask the human for a token, (b) patch `vite.config.ts` (not WS3-owned), (c) use the plugin's escape hatch found in its source: `CLOUDFLARE_VITE_FORCE_LOCAL=true`.
- **Choice:** (c) for all local runs; request (b) to the orchestrator so plain `npm run dev` works.
- **Rejected:** (a) blocks every workstream on an account credential for local UI work.

### D3.10 Lighthouse measured against production compression
- **Context:** local `vite preview` serves uncompressed assets (287 KB on the wire for the entry JS), which is not how Cloudflare Static Assets behave.
- **Options:** (a) report the raw preview score, (b) report only the production build without the worker, (c) measure the production build behind a Brotli static server that proxies `/api/*` to the Cloudflare preview worker.
- **Choice:** (c): **98 / 100 / 100 / 91** (Perf/A11y/BP/SEO), LCP 2.2 s, FCP 1.6 s, TBT 0. Raw preview score recorded as 83 for honesty.
- **Why:** matches the deployed transport (Cloudflare compresses text assets) while keeping the worker's API and headers.
- **Rejected:** (a) understates the product by ~15 points due to a local-server artifact; (b) console 404s would fail Best Practices.

## WS4

### WS4.1 OG fonts: inline subset WOFF, not runtime Google Fonts fetch
- **Options:** (a) `loadGoogleFont()` at render time, (b) ship fonts in `public/fonts` + ASSETS binding, (c) inline base64 WOFF in `src/worker/routes/og-font.ts`.
- **Choice:** (c) — Archivo 400/700 subset to Latin + Latin-1 + punctuation, ~17 KB each, decoded lazily once per isolate.
- **Why:** deterministic, no outbound fetch, works in the Workers Vitest pool and in-app browsers.
- **Rejected:** (a) network dependency; (b) needed an ASSETS binding that did not exist yet.

### WS4.2 workers-og HTML quirks
- **Context:** Satori throws unless every div has explicit `display:flex`; `ImageResponse` renders lazily, so a constructor try/catch misses render errors.
- **Choice:** keep HTML strings, set `display:flex` on decorative divs, and `await image.arrayBuffer()` inside `renderPng` so failures fall back to the default card.
- **Rejected:** hand-built React nodes — verbose, no safer.

### WS4.3 Client data fetching: plain fetch on WS4 pages
- **Context:** `App.tsx` (orchestrator-owned) has no `QueryClientProvider`.
- **Choice:** plain `fetch` + `AbortController`; no shared-file edit.
- **Rejected:** `useQuery` — would require an orchestrator change for no cache benefit at this scale.

### WS4.4 Share copy as a pure module
- **Choice:** `pages/me/share.ts` with no DOM access; URL-builder tests in `tests/worker/og.test.ts`.
- **Rejected:** inline template strings — untestable in the Workers pool.

### WS4.5 Cache API for OG images
- **Choice:** `caches.default` keyed by URL, `Cache-Control: public, max-age=3600`; cache failures fall through.
- **Rejected:** KV — an extra write per image for no benefit.

### WS4.6 `fomo` fallback and Google Calendar duration
- **Choice:** fall back to the `en` message when college rank is null; Google Calendar uses a 90-minute block.
- **Rejected:** printing `#null`; a 60-minute block that cuts off Q&A.

### WS4.7 Simulated-data detection on the leaderboard
- **Choice:** detect optional per-row flags; WS1 now returns `isSimulated` per row and includes simulated rows so the campus race is demoable, with the visible label.
- **Rejected:** always showing the label (wrong for all-real boards); hiding simulated rows (empty demo).

### WS4.8 Fixtures generated by curl, not by tests
- **Choice:** tests assert PNG bytes/dimensions/headers; committed fixtures were produced by curling the real Worker and inspected.
- **Why:** proves real runtime output, not a test-only path.

## WS5

1. **Registration counts are students only** (`role='student'`) so admin-created ambassadors don't inflate the 500 headline. Rejected: counting all users.
2. **Day boundaries use IST (+05:30)** (`date(created_at,'+330 minutes')`) because posting waves and the 9 PM review are India time. Rejected: UTC — an 11 PM IST post would slip a day.
3. **Campaign window is fixed to the PRD calendar** (day 7 = the IST day containing the workshop), so the chart and `plan.ts` agree across demo runs. Rejected: rolling last-7-days.
4. **Channel grouping is referral-first** (`referred_by IS NOT NULL` → Referral, else UTM, else Direct). Rejected: UTM-only — referral registrations would vanish into Direct.
5. **Rejecting a flag only rejects pending referrals**; qualified rows stay because a live check-in is stronger evidence than a heuristic flag. Rejected: rejecting qualified rows.
6. **Brief AI is optional and tracked** (`runAiJson` + `{summary}` schema, empty fallback, `aiAvailable=false` on failure, `ai_call` event). Rejected: failing the brief when AI fails.
7. **Admin-created ambassadors reuse `users`** with generated placeholder email/phone, hashed token, next seat. Rejected: a new table.
8. **Tests mount the admin app directly** while the public catch-all shadow existed; same routing/middleware/bindings. (Shadow fixed in Phase 2; the mounting helper is harmless.) Rejected: blocking on the orchestrator fix.
9. **UI data layer is TanStack Query with a page-local provider** because `App.tsx` has no provider and the lint config rejects sync setState in effects. Rejected: custom effect fetch loops; editing `App.tsx`.
10. **Time-lapse replay forces `includeSimulated=true`** and plays ~2.8 s/day; reduced motion jumps to the final frame. Rejected: animating real rows only — nothing to replay.
11. **`projectedTotal` uses filtered registrations and elapsed campaign days** via `projectFinalTotal`. Rejected: rows before now — the seeded window would project 0.
12. **CSV** uses CRLF, RFC quote escaping, IST-dated filename, and includes `is_simulated` so demo rows are never mistaken for real ones.

## WS6

### WS6.1 Broadcast coalescing: dirty channels + DO alarm
- **Context:** PRD M8 requires ≤ 2 broadcasts/s per socket with WebSocket hibernation; joins, check-ins, answers, stuck and shipped are all bursty.
- **Options:** (a) per-socket timestamp guard that drops updates inside 500 ms; (b) in-memory `setTimeout` buffer; (c) persisted dirty-channel set + `ctx.storage.setAlarm(due)`.
- **Choice:** (c). Handlers add a channel name to a SQLite `room_state.dirty` set; `scheduleBroadcast()` flushes immediately when ≥ 500 ms since the last flush, otherwise arms an alarm. The alarm handler flushes whatever is dirty.
- **Why:** (a) can lose the last state of a burst (no later event to flush it) and (b) dies on hibernation. (c) is hibernation-safe, coalesces a 10-join burst into one state frame, and the test asserts ≤ 2 state frames in the first second plus ≥ 400 ms spacing.
- **Rejected:** broadcasting on every message then relying on the client to debounce.

### WS6.2 Identity resolved in the route, carried in headers; DO can still resolve `join.token`
- **Context:** The contract allows `join.token`, but hashing a token per socket and hitting D1 inside the DO duplicates auth.
- **Choice:** `routes/live.ts` resolves the token (query `?t=` or `s60_token` cookie) once and passes `x-s60-user-id`/`x-s60-user-name`; the host role is only ever assigned from a verified admin cookie. `LiveRoom` treats the attachment as authoritative and additionally resolves `join.token` if the route had none.
- **Why:** One auth path, no client-claimed roles (`join.role:"host"` on a participant socket gets `FORBIDDEN`), and the DO works for tests/load without cookies.
- **Rejected:** Passing raw tokens into the DO and letting every message re-verify.

### WS6.3 Per-socket state via `serializeAttachment`, host channels filtered at broadcast
- **Choice:** `{role, userId, participantId, name, checkedIn}` lives in the socket attachment; `state` is built per socket, `stuck_queue`/`shipped_feed` are only sent to host attachments, `poll`/`quiz`/`leaderboard` go to everyone.
- **Why:** Hibernation restores attachments with the socket, so `checkedIn` and role survive eviction; queues contain other students' notes and stay host-only.
- **Rejected:** A `participants`-table lookup on every broadcast (slower and needs a socket→participant map that hibernation would drop).

### WS6.4 Late joiners get a full snapshot on `join`
- **Context:** Playwright verification caught a host joining after a stuck request seeing an empty queue, and a participant who joined after `launch_poll` never seeing the poll.
- **Choice:** `handleJoin` marks `state`, `poll`, `quiz`, `leaderboard` dirty (and `stuck`/`shipped` for hosts), so the next coalesced flush is a complete snapshot for that socket.
- **Why:** The DO only knew about these events at broadcast time; a late socket had no way to learn current class state. There is a regression test for both cases.
- **Rejected:** Sending snapshots directly on join (breaks the 2/s throttle during a burst) and adding a REST replay endpoint.

### WS6.5 Check-in is idempotent and DOS-mirrored; live attendance is real-only
- **Context:** Honesty rule: seeded/simulated rows must never be presented as real. D1 `checkins` is the system of record, but the DO needs a fast attendance count.
- **Choice:** `INSERT OR IGNORE` into D1 (is_simulated = 0) then into a DO mirror table; `qualifyReferral` + `recordEvent` only run when D1 actually inserted. The DO mirror never receives simulated rows.
- **Why:** 500 sockets checking in as the same user created exactly one D1 row and one event (verified), and `/live` never labels real attendance as simulated because it never includes seeded check-ins.
- **Rejected:** Counting D1 on every broadcast (cross-boundary latency) and copying seeded check-ins into the room (would force a "Simulated data" label on live attendance).

### WS6.6 Assembled-Worker upgrade blockers handled as requests + temporary patches
- **Context:** Two Phase 0/WS1 files intercept or break `/api/live`: `public.ts`'s `app.all("*")` shadows later `/api` mounts, and `securityHeaders()` throws `RangeError` re-wrapping a 101 upgrade into a 500.
- **Choice:** Kept the committed test suite on a local Hono harness that mounts `liveApp` at `/api/live` (real routes + real DO + real D1, no parent middleware), filed TASKS.md Requests #13/#14, and verified the assembled dev server, pages and 500-socket load with both patches temporarily applied and then restored byte-for-byte (`cmp` clean).
- **Why:** WS6 does not own `public.ts`/`http.ts`; the tests must pass on the current tree while the exact one-line fixes are known and recorded. `SELF`-based upgrade tests would 500 until the orchestrator lands the fix.
- **Rejected:** Editing WS1 files permanently, or marking the feature verified on the old stub route only.

## WS7

### WS7.1 SSRF guard without DNS pre-resolution
- **Context:** M9 fetches user-supplied URLs from inside the Worker. Cloudflare `fetch` gives no way to inspect the peer IP, so the guard runs before the request.
- **Options:** (a) regex blocklist of "bad" strings; (b) `URL` parse + host classification, blocking loopback/private/link-local/CGNAT/metadata hosts and non-standard ports; (c) opt (b) plus a DNS-over-HTTPS A-record lookup before fetching.
- **Choice:** (b). http/https only, ports 80/443 only, no credentials in the URL, reject localhost/`*.local`/`*.internal`, RFC1918, 127/8, 169.254/16, 100.64/10, 0/8, multicast/reserved, IPv6 loopback/ULA/link-local/NAT64, IPv4-mapped forms, and numeric/hex encodings of 127.0.0.1. Redirects are fetched with `redirect: "manual"` and every hop is re-validated (max 3).
- **Why:** Covers the tests and every literal-IP/metadata path without adding latency or a second network dependency; the 5 s probe budget stays intact.
- **Rejected:** (a) misses `0x7f000001`/decimal forms and redirect hops; (c) adds a DoH request per submission and still leaves a TOCTOU rebinding window, so it was not worth it. Known residual: a hostname that resolves to a private IP at connect time is not detected — recorded here for the security reviewer.

### WS7.2 Live probe: manual redirects, streamed 200 KB cap
- **Context:** PRD M9 wants status, `<title>` and response time, max 200 KB.
- **Choice:** stream the body through a reader that stops at 200 KB (no `text()` on unbounded responses), `AbortSignal.timeout(5000)` on the whole probe, and a `Ship60Bot/1.0` user agent. HTTP error statuses are recorded as data (model can score `worksLive` low) rather than treated as probe failures; only network/timeout/invalid-redirect failures produce `ok: false`.
- **Rejected:** `res.text()` + slice (buffers up to Cloudflare's response limit); following redirects automatically (cannot re-validate each hop).

### WS7.3 Evaluator framing and score normalisation
- **Context:** PRD M9/§6.6: rubric, one retry, zod, untrusted content delimited, never let fetched text change scoring rules.
- **Choice:** rubric, output schema and the ignore-instructions rule live only in the system message; every attacker-controlled string (description, page title, GitHub metadata, README) sits inside one `<<<UNTRUSTED_START>>>…<<<UNTRUSTED_END>>>` block. Marker strings are stripped from untrusted text so it cannot close the block early. The schema adapter recomputes `score = sum(breakdown)` so the displayed total can never disagree with the rubric. README is fetched/capped at 50 KB (brief) but the prompt carries the first 16 000 chars + `[README truncated]` so the 70B call stays inside its 15 s budget. `EvaluationSchema` validates the shape; `null` fallback → status `manual`.
- **Why:** Matches the brief exactly and makes the injection test meaningful: the model sees the injected text only as evidence inside the delimiters.
- **Rejected:** putting rubric text in the user message (injection surface), trusting the model's own `score` field (could contradict its breakdown).

### WS7.4 Bad fetch or AI outage never returns 5xx
- **Context:** Brief: "never a hard 500 for a bad fetch".
- **Choice:** the row is inserted as `queued`, then updated to `evaluated` / `manual`; manual/failed rows store a diagnostic JSON (`code: EVALUATION_UNAVAILABLE`, message, source/attempts) in the `evaluation` column. `SubmissionResponse.evaluation` still returns `null` unless the row is `evaluated`, so the public contract is untouched. An unexpected crash is caught, the row becomes `failed`, and the API returns 200 with that status. SSRF-invalid URLs are the one exception: 400 `INVALID_INPUT` before any row is created.
- **Rejected:** adding a `status_message` column (migration is orchestrator-owned); throwing 500/503 for AI failure (worse UX and violates the brief).

### WS7.5 Certificates: standalone SSR page + small JSON endpoint
- **Context:** `/cert/:id` must be WhatsApp-previewable (OG tags) and verifiable. `wrangler.jsonc` routes `/cert/*` to the Worker first, so a pure SPA page would never see a crawler.
- **Choice:** `certRoutes` server-renders a standalone HTML page with OG tags and prints/PDF support; the React `CertPage` (used on client-side navigation) calls `GET /api/submissions/cert/:id` returning `CertificateResponseSchema`. That JSON path is not in the PRD §6.5 table — it is a local WS7 extension inside the mounted app. Certificate ids are `newId("cert")` (128-bit), one per user (a re-submission reuses the first id). Project title comes from `users.idea_key` → `IDEA_BANK` and is nullable.
- **Why:** Crawlers and no-JS clients get the OG page; the SPA gets typed JSON; no new dependency.
- **Rejected:** injecting certificate data into the SPA shell (fragile string surgery, and the SPA bundle is WS3/orchestrator-owned); `/cert/:id.png` for now — `workers-og`'s default font fetches Google Fonts at request time and bundled satori cannot read the WS3 `.woff2` fonts, so a real PNG needs WS4's font strategy (request filed; page points `og:image` at `/og/default.png` meanwhile).

### WS7.6 Reminders: offsets, window, dedupe, optional Resend
- **Context:** Cron every 15 min; D-1 evening, 2 h before, 15 min before; no key → log and expose.
- **Choice:** reminder times are `WORKSHOP_START_ISO −24 h/−2 h/−15 min` (13:30 UTC start → 19:00 IST, so −24 h is the previous evening). A tick fires when `due ≤ now < due + 30 min`, and each kind is claimed once per workshop by reading its KV record. The message always lands at KV `reminder:{kind}` for WS5; with `RESEND_API_KEY` it is also emailed to up to 100 non-simulated registrants per reminder via Resend. Counts in the message are real (`is_simulated = 0`) only; with zero registrations the social-proof line is omitted. Every step is wrapped in try/catch and only logged.
- **Why:** Idempotent across retries and clock skew; no paid service required.
- **Rejected:** deriving D-1 from a timezone library (no dependency; documented assumption); sending a single Resend email to all recipients (`to:` array leaks every address to every recipient) and no batch endpoint on the free tier. Known free-tier caveat: Resend's `onboarding@resend.dev` sender only reaches the account owner until a domain is verified — the KV/logged message is unaffected.

### WS7.7 Tests call the WS7 apps directly
- **Context:** `public.ts`'s `app.all("*")` (WS1) is mounted at `/api` before `/api/submissions`, so the assembled Worker 404s before WS7 is reached (confirmed on `npm run dev` and via `SELF`; request on the board for the orchestrator).
- **Choice:** `tests/worker/submissions.test.ts` imports `routes/submissions.ts` + `certRoutes` and calls `app.request(path, init, env)`; the suite still runs in workerd with D1/KV/AI bindings, so SSRF, rate limit, events and cert rendering are exercised for real. The full HTTP flow was additionally verified with a temporary `wrangler dev` harness (deleted after: live `example.com` fetch + real GitHub README, fake AI happy path, real cron tick) plus a 390×844 Playwright pass on the built SPA.
- **Rejected:** leaving the tests red against `SELF` (would block marking WS7 done on someone else's file).


## WS8

### WS8.1 Seed coexists with real rows in a shared local D1
- **Context:** parallel workstreams and e2e runs insert non-simulated users; a fixed seat range collides.
- **Options:** (a) fixed seats 1–520, (b) delete real rows first, (c) reserve existing seats/phones/ref codes and start after `MAX(seat_no)`.
- **Choice:** (c) — never touches real data, idempotent, canonical seats 1–520 on a fresh DB.
- **Rejected:** (a) breaks on any dev registration; (b) destroys fixtures and violates honesty/ownership.

### WS8.2 Channel targets derived from `plan.ts`
- **Choice:** import `CHANNELS` and use `registrations`, with per-channel assertions.
- **Rejected:** hardcoding 245/80/60/25/110 — duplicates the source of truth.

### WS8.3 Ambassador links are referral rows too
- **Choice:** attribute ambassador-channel registrations to their ambassador (355 referral rows); k ≈ 0.27 still computed on the 110/410 loop.
- **Why:** M7 ambassador stats and the admin ambassadors table need "registrations driven".
- **Rejected:** only the referral-loop users get `referred_by` — every ambassador would show zero.

### WS8.4 SQL applied in <75 KB chunks through wrangler
- **Choice:** chunk statements and run `wrangler d1 execute --file` sequentially; temp files removed in `finally`.
- **Rejected:** one 1.3 MB file (risky remote); writing the local SQLite file directly (not the specified path, remote-hostile).

### WS8.5 Seeded `idea_key` uses the exact bank key (`branch|interest`)
- **Choice:** (b) the exact `IDEA_BANK` key so `/api/me` renders a real project.
- **Rejected:** `branch|interest|variant` — would fail unless WS1 strips the variant.

### WS8.6 `/plan` print via CSS only, all slides in the DOM
- **Choice:** one DOM tree with `@media print { display:block !important; break-after: page }`; verified 5-page PDF.
- **Rejected:** duplicated hidden print copies or a separate route — drift risk.

### WS8.7 `/build` markdown: local ~60-line parser, no dependency
- **Choice:** parser for headings/bullets/paragraphs/bold/code; page stays ~13 kB gzip.
- **Rejected:** `marked`/`markdown-it` — a dependency for one static page.

### WS8.8 Dev-server verification workaround (platform fact)
- **Context:** `npm run dev` fails non-interactively because the Vite plugin opens a remote proxy session for the AI binding.
- **Choice:** verify via build + `wrangler dev`; filed the `remoteBindings: false` request (applied by the orchestrator in Phase 2).
- **Rejected:** editing shared config from a subagent (ownership rule 2).

## Phase 2 — integration (orchestrator)

### I2.1 Removed the WS1 `/api` catch-all
- **Context:** `public.ts` mounted at `/api` before sibling mounts; its `app.all("*")` shadowed `/api/ideas|admin|live|submissions` (reported by WS2/5/6/7/9).
- **Options:** (a) reorder mounts, (b) delete the catch-all and rely on `index.ts`'s `/api/*` fallback, (c) keep it and mount siblings first.
- **Choice:** (b). Unknown `/api/*` still returns the JSON error envelope from `index.ts`.
- **Rejected:** (a)/(c) leave a footgun for the next mounted module.

### I2.2 `securityHeaders()` passes 101 upgrades through
- **Context:** wrapping a 101 in `new Response(...)` throws `RangeError` (WS6 request #13).
- **Choice:** early return when `status === 101 || response.webSocket`. 500-socket load and live e2e now pass through the assembled Worker.
- **Rejected:** special-casing the live route only — any future WebSocket route would break again.

### I2.3 Public leaderboard includes simulated rows, labelled per row
- **Context:** WS1 excluded `is_simulated = 0` everywhere, so the seeded demo leaderboard was empty; rule 5 requires a visible label when simulated numbers are shown.
- **Options:** (a) keep excluding, (b) include with `isSimulated` per row + the WS4 "Simulated data" badge.
- **Choice:** (b) — the campus race is the demo centrepiece and the honesty mechanism is the label.
- **Rejected:** (a) empty leaderboard in every demo.

### I2.4 Leaderboard KV cache invalidated on writes
- **Context:** the 60 s cache served pre-check-in state to the e2e leaderboard assertion.
- **Choice:** delete `leaderboard:students|colleges` on register (WS1) and on successful check-in (LiveRoom). Reads stay cached for 60 s.
- **Rejected:** reducing TTL or busting the cache from the client.

### I2.5 `vite.config.ts`: `remoteBindings: false`, `optimizeDeps.include: ["recharts"]`, Turnstile define
- `remoteBindings: false` makes `npm run dev` work without `wrangler login` (AI falls back to the bank); real AI still needs auth.
- Pre-bundling recharts prevents a mid-e2e dependency re-optimization reload that cleared the registration form.
- `import.meta.env.VITE_TURNSTILE_SITE_KEY` defaults to the dev test key and is injected from the environment for production builds (WS3 request #10).

### I2.6 `ASSETS` binding added; `AppEnv` is an intersection
- Added `assets.binding: "ASSETS"` and regenerated types (WS4 request #2).
- `AppEnv` changed from `interface extends Env` to `Env & {...}` because `wrangler types` reads `.dev.vars` and types the secrets as required strings, which made an interface with optional overrides invalid.

### I2.7 Contracts additions
- `CollegeListResponseSchema` pinned to a bare `CollegeOption[]` (what `/api/colleges` returns).
- `isSimulated` optional per leaderboard row.
- Both requested by WS3/WS4; additive only.

### I2.8 `/live` cookie auth: DO state reports `hasSeat`
- **Context:** the token cookie is HttpOnly, so the client cannot read it; `/live` showed the guest UI for cookie-authenticated users.
- **Choice:** the DO `/state` response adds `hasSeat` (from the `x-s60-user-id` header) and the page shows the check-in control for cookie-authenticated users; the WS upgrade already authenticates by cookie server-side.
- **Rejected:** storing the token in localStorage — weaker than the HttpOnly cookie.

## WS9

### WS9.1 Feature-blocked specs probe the contract, then skip naming the module
- **Context:** Phase 1 builds WS1–WS8 in parallel; e2e must run today and turn green by itself in Phase 2, never silently.
- **Options:** (a) `test.fixme` whole files until integration, (b) let every missing feature crash at the first selector, (c) probe the endpoint statuses that prove a feature landed and `test.skip(reason)` naming the workstream.
- **Choice:** (c) for API-dependent specs. `/plan` and the mobile landing have no API dependency, so they assert and fail with module-tagged messages; axe skips only Phase 0 stub pages ("nothing meaningful to scan").
- **Why:** `test.fixme` never re-enables itself; probes convert yesterday's skip into today's pass/fail automatically; every skip line names WS1/WS2/WS5/WS6.
- **Rejected:** fixme-everything (integration invisible), all-fail (real config faults indistinguishable from unbuilt features).

### WS9.2 Clean-checkout e2e bootstrap lives in the Playwright webServer
- **Context:** a non-interactive `vite dev` tries to proxy the Workers AI binding to Cloudflare and dies without `CLOUDFLARE_API_TOKEN`; admin login needs `ADMIN_PASSWORD`. Verified against `@cloudflare/vite-plugin` 1.62: AI bindings default to remote unless `CLOUDFLARE_VITE_FORCE_LOCAL=true` or the plugin's `remoteBindings: false`.
- **Options:** (a) edit `vite.config.ts` / `wrangler.jsonc` (shared files, forbidden for WS9), (b) require a hand-made `.dev.vars`, (c) have `webServer.command` append the missing test-only keys to gitignored `.dev.vars` and set `CLOUDFLARE_VITE_FORCE_LOCAL=true` for the dev process.
- **Choice:** (c). Values match `tests/worker` (`test-admin-password` / `test-session-secret`), never real secrets; AI degrades to the static idea bank exactly as PRD §6.6 promises.
- **Why:** no shared-file edits, works from a clean checkout, no remote calls.
- **Rejected:** (a) cross-workstream edits; wiping KV/D1 between runs (destroys seeded data and can race a reused dev server).

### WS9.3 Simulated client IPs per test
- **Context:** `/api/register` is rate-limited 5/hour and `ip_velocity`-flags an IP after 5 registrations/hour, both keyed by the IP hash; every local test run shares 127.0.0.1, so repeats would 429 or flag test users.
- **Options:** (a) delete local KV state between runs, (b) unique `cf-connecting-ip` per browser/API context, (c) raise the limits in dev.
- **Choice:** (b). `clientIp()` trusts the header locally; at the edge Cloudflare overwrites it, so production behaviour is untouched.
- **Why:** no destructive resets and each test acts as a distinct student device; kept seeded D1 intact.
- **Rejected:** (a) nukes WS2's warm idea cache and can race a reused dev server; (c) hides the production rate-limit path.

### WS9.4 `/r/CODE` 404 is WARN in smoke, everything else is strict
- **Context:** smoke probes one literal referral code; on a clean database no user has `CODE` (today WS1 answers 302 to `/`), and an unknown code is a legitimate response, not a broken route.
- **Choice:** `/r/:code` accepts 200/3xx as PASS and 404 as WARN with a note; every other route must match its expected status, and JSON routes must satisfy the zod schemas from `src/shared/contracts.ts`. `--code` lets the Phase 4 run point at a seeded user.
- **Why:** the script stays red only for genuinely missing/broken routes and exits 1 on any FAIL.
- **Rejected:** 404 = FAIL (always red against a clean DB), 404 = PASS (hides a dead route).

### WS9.5 Contract validation inside smoke
- **Context:** a 200 from an unimplemented stub or a malformed response is worse than a 404.
- **Choice:** `StatsPublicResponseSchema`, `LeaderboardResponseSchema`, `z.array(CollegeOptionSchema)` and the PNG/HTML content types are parsed on every smoke run; schema mismatches FAIL with the zod issue.
- **Rejected:** status-only checks.

### WS9.6 Probe retries and an explicit Vite-overlay guard
- **Context:** parallel workstreams restart the Vite/Workers dev server on every config/source change; a readiness probe hitting that window 404s a live route, and a compile error surfaces as a misleading locator timeout or an axe violation on Vite's own `<vite-error-overlay>`.
- **Choice:** endpoint probes retry up to 3 times (750 ms apart) before reporting; every spec calls `assertAppRendered()` after navigation, which fails with the overlay's error text when present.
- **Why:** skips and failures stay attributed to the right workstream instead of flipping on a dev-server restart.
- **Rejected:** sleeping before every probe (slows green runs and still races), ignoring the overlay (wrong module blamed).
