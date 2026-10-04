/**
 * WS9 — smoke test for every public route in PRD §6.5.
 *
 * Usage:
 *   npx tsx scripts/smoke.ts [--url http://localhost:5173] [--code CODE] [--timeout 10000]
 *
 * PASS  = expected status and (where applicable) the zod contract validates.
 * WARN  = an allowed non-success response, e.g. `/r/CODE` for a code that has
 *         no user yet — an unknown referral code is a legitimate answer.
 * FAIL  = unreachable, unexpected status, or a response that breaks the
 *         `src/shared/contracts.ts` schema. The script exits 1 when anything
 *         FAILs, so it can gate deployment once the features land.
 *
 * Features may still be 404 today; that is reported as FAIL with the status,
 * which is exactly the signal Phase 2 integration needs.
 */
import { z } from "zod";
import {
  CollegeOptionSchema,
  LeaderboardResponseSchema,
  StatsPublicResponseSchema,
} from "../src/shared/contracts";

const args = process.argv.slice(2);

function flagValue(flag: string, fallback: string): string {
  const index = args.indexOf(flag);
  const value = index === -1 ? undefined : args[index + 1];
  return value && !value.startsWith("--") ? value : fallback;
}

const baseUrl = flagValue("--url", "http://localhost:5173").replace(/\/+$/, "");
const code = flagValue("--code", "CODE").toUpperCase();
const timeoutMs = Number(flagValue("--timeout", "10000"));

if (args.includes("--help") || args.includes("-h")) {
  console.log(
    "Usage: npx tsx scripts/smoke.ts [--url <base>] [--code <referral code>] [--timeout <ms>]",
  );
  process.exit(0);
}

type Verdict = "PASS" | "FAIL" | "WARN";
type Validator = (response: Response, body: string) => string | null;

const htmlValidator: Validator = (response, body) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return `content-type ${contentType || "missing"}`;
  return /<html[\s>]/i.test(body) ? null : "body is not HTML";
};

function jsonValidator<T>(schema: z.ZodType<T>): Validator {
  return (_response, body) => {
    try {
      schema.parse(JSON.parse(body));
      return null;
    } catch (error) {
      return `invalid JSON shape: ${error instanceof Error ? error.message : String(error)}`;
    }
  };
}

const pngValidator: Validator = (response) => {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("image/png") ? null : `content-type ${contentType || "missing"}`;
};

interface RouteCheck {
  path: string;
  label: string;
  expect: number[];
  optional?: { statuses: number[]; note: string };
  validate?: Validator;
  passNote?: (response: Response) => string;
}

const checks: RouteCheck[] = [
  { path: "/", label: "landing (SPA shell)", expect: [200], validate: htmlValidator },
  {
    path: `/r/${code}`,
    label: "referral HTML + OG tags",
    expect: [200, 301, 302, 307, 308],
    optional: {
      statuses: [404],
      note: `no user for code ${code} yet (or WS1 not landed)`,
    },
    validate: (response, body) => (response.status === 200 ? htmlValidator(response, body) : null),
    passNote: (response) =>
      response.status === 200
        ? "OG HTML"
        : `redirect → ${response.headers.get("location") ?? "?"}`,
  },
  { path: "/og/default.png", label: "default share card", expect: [200], validate: pngValidator },
  {
    path: "/api/stats/public",
    label: "public stats",
    expect: [200],
    validate: jsonValidator(StatsPublicResponseSchema),
  },
  {
    path: "/api/leaderboard?type=students",
    label: "student leaderboard",
    expect: [200],
    validate: jsonValidator(LeaderboardResponseSchema),
  },
  {
    path: "/api/colleges?q=a",
    label: "college typeahead",
    expect: [200],
    validate: jsonValidator(z.array(CollegeOptionSchema)),
  },
  { path: "/api/health", label: "health", expect: [200] },
  { path: "/plan", label: "growth deck (SPA shell)", expect: [200], validate: htmlValidator },
  { path: "/leaderboard", label: "leaderboard page (SPA shell)", expect: [200], validate: htmlValidator },
  { path: "/build", label: "build notes (SPA shell)", expect: [200], validate: htmlValidator },
];

interface Result {
  method: "GET";
  path: string;
  status: string;
  latencyMs: number;
  verdict: Verdict;
  note: string;
}

async function runCheck(check: RouteCheck): Promise<Result> {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: "*/*", "user-agent": "ship60-smoke/1.0" },
    });
    const latencyMs = Date.now() - started;
    const body = await response.text();

    if (check.expect.includes(response.status)) {
      const failure = check.validate?.(response, body) ?? null;
      if (failure) {
        return { method: "GET", path: check.path, status: String(response.status), latencyMs, verdict: "FAIL", note: failure };
      }
      const note = check.passNote?.(response) ?? (response.headers.get("content-type") ?? "").split(";")[0];
      return { method: "GET", path: check.path, status: String(response.status), latencyMs, verdict: "PASS", note };
    }

    if (check.optional?.statuses.includes(response.status)) {
      return {
        method: "GET",
        path: check.path,
        status: String(response.status),
        latencyMs,
        verdict: "WARN",
        note: check.optional.note,
      };
    }

    return {
      method: "GET",
      path: check.path,
      status: String(response.status),
      latencyMs,
      verdict: "FAIL",
      note: `expected ${check.expect.join("/")}`,
    };
  } catch (error) {
    return {
      method: "GET",
      path: check.path,
      status: "---",
      latencyMs: Date.now() - started,
      verdict: "FAIL",
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

const results: Result[] = [];
for (const check of checks) {
  results.push(await runCheck(check));
}

const headings = ["METHOD", "ROUTE", "STATUS", "LATENCY", "RESULT", "NOTE"];
const rows = results.map((result) => [
  result.method,
  result.path,
  result.status,
  `${result.latencyMs}ms`,
  result.verdict,
  result.note,
]);
const widths = headings.map((heading, column) =>
  Math.max(heading.length, ...rows.map((row) => row[column].length)),
);
const formatRow = (cells: string[]) => cells.map((cell, i) => cell.padEnd(widths[i])).join("  ");

console.log(`Ship60 smoke — ${baseUrl}\n`);
console.log(formatRow(headings));
console.log(widths.map((width) => "-".repeat(width)).join("  "));
const colorFor: Record<Verdict, string> = { PASS: "\u001b[32m", FAIL: "\u001b[31m", WARN: "\u001b[33m" };
for (const row of rows) {
  const line = formatRow(row);
  const verdictStart = widths.slice(0, 4).reduce((sum, width) => sum + width + 2, 0);
  const plain = process.stdout.isTTY
    ? `${line.slice(0, verdictStart)}${colorFor[row[4] as Verdict]}${line.slice(verdictStart, verdictStart + widths[4])}\u001b[0m${line.slice(verdictStart + widths[4])}`
    : line;
  console.log(plain);
}

const passed = results.filter((result) => result.verdict === "PASS").length;
const warned = results.filter((result) => result.verdict === "WARN").length;
const failed = results.filter((result) => result.verdict === "FAIL").length;

console.log("");
console.log(`${baseUrl} — ${checks.length} routes: ${passed} passed, ${warned} warned, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
}
