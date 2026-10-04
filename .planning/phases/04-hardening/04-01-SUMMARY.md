# 04-01 Summary — security C1/H1, idea key, cron copy

**Status:** complete. All four tasks implemented, tested and verified locally.

## Files changed

- `src/worker/routes/public.ts` — duplicate registration now requires proof of ownership; per-identifier duplicate rate limit.
- `src/worker/routes/live.ts` — `/ws` builds fresh headers; client `x-s60-*` never forwarded.
- `src/worker/lib/idea-card.ts` — parses `idea:{branch}:{interest}:{variant}` as well as `branch|interest[|variant]` and JSON.
- `src/worker/cron.ts` — student-facing reminder copy; ambassador copy moved to optional `ambassadorNote` KV payload field.
- `tests/worker/public.test.ts` — duplicate no-proof 409, token/cookie rotation 200, duplicate rate limit, stored idea-key resolution.
- `tests/worker/live.test.ts` — forged `x-s60-user-id` header test (anonymous, no D1 checkin row).
- `tests/worker/submissions-cron.test.ts` — student-message assertions + `buildAmbassadorNote` unit coverage.

## Commands and results

- `npx vitest run tests/worker/public.test.ts tests/worker/live.test.ts tests/worker/submissions-cron.test.ts` → **3 files, 54 tests passed** (includes all new tests, verified with verbose reporter).
- `npx tsc -b` → clean (`TSC_CLEAN`); `npx tsc -b --force` also clean.
- `npx eslint src/worker tests/worker` → clean (`ESLINT_CLEAN`, no errors or warnings).
- Acceptance greps: `ERROR_CODES.DUPLICATE` (public.ts:136), `new Headers()` in `/ws` (live.ts:51), `startsWith("idea:")` (idea-card.ts:29), student message `starts` (cron.ts:64).

Note: one early `tsc -b` run (before siblings landed) reported stale incremental errors in `admin.ts` and `RegistrationForm.tsx`, files owned by plans 04-02/04-03 and untouched here; a forced build and the final build are green.

## Decisions

1. **Proof semantics (C1).** A duplicate email/phone only rotates a token when the request's `?t=`, `Authorization: Bearer`, or `s60_token` cookie resolves to the same user id (`getUserFromRequest`). Otherwise `apiError(ERROR_CODES.DUPLICATE, "This email or WhatsApp number already has a seat. Open your Launchpad from the link you saved.")` → 409 with no token, no `set-cookie`, no `launchpadUrl`. The insert-race path calls the same `returningResponse`, so it behaves identically.
2. **Per-identifier dup limit.** KV key `register-dup:{sha256(email|phone)}` with 10 attempts/hour via the existing `rateLimit` helper and `c.env.CACHE`, checked before the proof test so probing is bounded. Values are hashed from the stored canonical `existing.email|existing.phone`. The 10/h constant is local to `public.ts` because `src/shared/constants.ts` is orchestrator-owned.
3. **LiveRoom identity (H1).** `live.ts` starts from `new Headers()`, copies only `Upgrade: websocket` and `Connection` when it contains `upgrade`, then sets `x-s60-workshop-id`, `x-s60-upgrade`, `x-s60-role`; `x-s60-user-id`/`x-s60-user-name` are set only when the query token or cookie resolves. A client-supplied identity header can never survive the route.
4. **Idea key format.** `splitStoredKey` strips the `idea:` prefix and splits on `:` (branch first; branch contains `/` but no `:`); the seed format `branch|interest[|variant]` and JSON blobs still work. The returned card's `key` remains the original stored string. Unknown branch/interest still yields `null`.
5. **Cron copy.** Student message is `Your NxtWave AI workshop starts {when}.` + `Bring a laptop; you'll deploy your project live.` + `Your seat: {seat}.` only when a seat is supplied (the broadcast has none, so omitted). No registration CTA, no "0 colleges", no ambassador instructions. `ambassadorNote` is stored in the existing `reminder:{kind}` KV record only when registrations > 0 and colleges > 0; keys and other payload fields unchanged.
6. **No dependency or shared-file edits.** `src/shared/contracts.ts`, `src/shared/constants.ts`, `src/worker/index.ts`, `migrations/` untouched.

## Deferred / out of scope

- `src/worker/routes/og.ts` has the same `idea:` key parsing bug (ux-copy C1) but is not in this plan's file set — left to its owner.
- `buildReminderMessage`'s `seat` argument is only useful for a future per-student email template; the cron broadcast always omits it.
- Remaining 04-hardening findings not covered here: Turnstile fail-open (M1), DNS SSRF (M2), `/api/events` hardening — orchestrator already updated contracts (M3), SPA security headers (M4), CSV injection (M5), brief prompt injection (M6), token-in-URL (L1), cert PII (L2), dev secrets in dist (L3), live socket cap (L4), admin session revocation (L5).
