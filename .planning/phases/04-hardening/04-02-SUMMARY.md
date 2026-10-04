# 04-02 Summary — Backend security mediums, certificate PII, OG idea keys

Plan: `.planning/phases/04-hardening/04-02-PLAN.md` · Requirements: ADM-03, ADM-04,
EVAL-02, EVAL-03, LP-02 · Status: all five tasks implemented and verified.

## Task results

1. **CSV formula injection (M5)** — `csvEscape` now prefixes `'` when the first
   character is `= + - @ \t \r` before CSV quoting, and the export response sends
   `x-content-type-options: nosniff` (`src/worker/routes/admin.ts:126,832`). Test
   seeds `=HYPERLINK("https://evil.example","open")` and asserts the cell is
   `"'=…"`, never `=` or `"=` (`tests/worker/admin.test.ts`).
2. **Brief prompt injection + simulated default (M6, ADM-03)** — `buildBriefPrompt()`
   wraps all facts in the `<<<UNTRUSTED_START>>>/<<<UNTRUSTED_END>>>` block reusing
   `sanitizeUntrusted`/markers from `lib/eval/rubric.ts`, with a system rule that the
   block is data and instructions inside it are never followed. Rule-based brief
   lines unchanged. `resolveIncludeSimulated()` replaces the old sync parser: explicit
   `?includeSimulated=true|false` always wins; absent defaults to `true` only when
   real student registrations are 0 and simulated rows exist. Applied to every admin
   read endpoint plus `/brief` and `/export.csv`.
3. **DNS-aware SSRF guard (M2)** — `validateTargetUrl(raw, { resolve })` and new
   `validateRedirect(location, base, { resolve })` are async. Default resolver does
   Cloudflare DoH JSON for A and AAAA (`accept: application/dns-json`, 1.5 s timeout,
   60 s in-isolate Map cache, filtered to answer types 1/28), rejects when any answer
   is private/loopback/link-local/CGNAT/metadata via the existing classifier, fails
   closed on resolver error/empty answers, and skips resolution for literal IPs or
   hosts already rejected. `probeLivePage` awaits it before the initial fetch and
   every redirect hop (`src/worker/lib/eval/live-page.ts:27,39,66`); the submissions
   pre-check awaits it too. Tests inject resolvers (127.0.0.1 → rejected, public IP →
   allowed, mixed → rejected, literal hosts never resolve) and assert zero fetch
   calls; literal SSRF tests stay network-free because DoH is mocked in `mockOutbound`.
4. **Certificate public name + simulated label (EVAL-03)** — `loadCertificate` selects
   `s.is_simulated`, returns `name: publicName(u.name)` and `isSimulated`, and both
   the HTML page and JSON expose the masked name. The page renders a visible
   “Simulated data” line when the submission row is simulated. Tests assert the full
   name/surname never appears on the public page or JSON.
5. **OG card real project title (LP-02)** — `og.ts` no longer parses keys itself; it
   imports `resolveIdeaCard` from `../lib/idea-card` and exports `projectTitle()`.
   The WS2 key `idea:CSE/IT/AI-ML:placements:0` now resolves to “Placement Prep
   Buddy”; bank keys and JSON still work. Test asserts the helper and a PNG
   `image/png` response for that user (`tests/worker/og.test.ts`).

## Verification

```
npx vitest run tests/worker/admin.test.ts tests/worker/submissions.test.ts tests/worker/og.test.ts
→ 3 files, 53 tests passed

npx vitest run            → 8 files, 122 tests passed
npx tsc -b                → clean
npx eslint src/worker tests/worker → clean
```

## Decisions / assumptions (for DECISIONS.md — not edited, file not authorized)

- `validateTargetUrl` is now async. The only callers are `submissions.ts` and
  `live-page.ts` (awaited); `lib/eval/index.ts` re-export unchanged. Resolver errors
  and empty answers fail closed; failure reason “could not be verified right now”.
- `includeSimulated` default is global student-registration state, not per-endpoint:
  real count 0 + simulated > 0 → true. Explicit `true`/`false` always wins; any other
  value falls back to the default.
- The DoH resolver issues one query per record type (A, AAAA) per host per 60 s and
  caches only successful lookups; private answers are classified after retrieval.
- Certificate `isSimulated` is read from `submissions.is_simulated` (the row that
  issued the certificate), not `users.is_simulated`.

## Requests

- None blocking. 04-01 already landed the `idea:` parser in `lib/idea-card.ts`
  (`splitStoredKey`), which this plan depends on; `resolveIdeaCard`’s export shape
  needed no change.
- Orchestrator: please append the decisions above to `DECISIONS.md` (WS5/WS7
  headings) since `DECISIONS.md` was outside this plan’s authorized file list.
