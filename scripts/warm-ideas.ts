/**
 * WS2 — warm the idea cache.
 *
 * Calls POST /api/ideas/preview for all 6 branches × 8 interests × 3 variants
 * (144 requests) and writes reviews/idea-bank-review.md for a human to skim.
 * Never touches wrangler KV directly.
 *
 * Usage:
 *   npx tsx scripts/warm-ideas.ts                       # http://localhost:5173
 *   npx tsx scripts/warm-ideas.ts --url <base>          # any base URL
 *   npx tsx scripts/warm-ideas.ts --remote --url <url>  # deployed URL
 *   npx tsx scripts/warm-ideas.ts --limit 3             # first 3 combinations
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BRANCHES, INTERESTS, VARIANTS } from "../src/shared/constants";

const DEFAULT_URL = "http://localhost:5173";
const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_500;

interface CliArgs {
  url?: string;
  remote: boolean;
  limit?: number;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { remote: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--url") {
      const value = argv[++i];
      if (!value) throw new Error("--url needs a value, e.g. --url https://ship60.example.workers.dev");
      args.url = value;
    } else if (arg === "--remote") {
      args.remote = true;
    } else if (arg === "--limit") {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 1) throw new Error("--limit needs a positive integer");
      args.limit = value;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printUsage(): void {
  console.log(
    [
      "Usage: npx tsx scripts/warm-ideas.ts [options]",
      "  --url <base>     base URL (default http://localhost:5173)",
      "  --remote         require a deployed URL (--url or SHIP60_BASE_URL)",
      "  --limit <n>      only the first n branch×interest combinations",
      "  --help           show this help",
    ].join("\n"),
  );
}

function resolveBaseUrl(args: CliArgs): string {
  if (args.url) return args.url.replace(/\/+$/, "");
  const envUrl = process.env.SHIP60_BASE_URL ?? process.env.PUBLIC_BASE_URL;
  if (args.remote) {
    if (envUrl && !/localhost|127\.0\.0\.1/.test(envUrl)) return envUrl.replace(/\/+$/, "");
    throw new Error(
      "--remote needs --url <deployed-url> or SHIP60_BASE_URL; PUBLIC_BASE_URL is localhost.",
    );
  }
  return (envUrl ?? DEFAULT_URL).replace(/\/+$/, "");
}

async function postIdea(
  base: string,
  body: { branch: string; interest: string; variant: number },
): Promise<{ title: string; source: string }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${base}/api/ideas/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) {
        const data = (await res.json()) as { idea?: { title?: unknown; source?: unknown } };
        return {
          title: typeof data.idea?.title === "string" ? data.idea.title : "?",
          source: typeof data.idea?.source === "string" ? data.idea.source : "?",
        };
      }
      lastError = new Error(`HTTP ${res.status}`);
      if (res.status < 500 && res.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const base = resolveBaseUrl(args);
  const combinations = BRANCHES.flatMap((branch) =>
    INTERESTS.map((interest) => ({ branch, interest })),
  );
  const selected = args.limit ? combinations.slice(0, args.limit) : combinations;
  const total = selected.length * VARIANTS.length;

  console.log(`Warming ${selected.length} combinations (${total} requests) against ${base}`);
  const lines: string[] = [];
  let ok = 0;
  let failed = 0;

  for (const { branch, interest } of selected) {
    for (const variant of VARIANTS) {
      try {
        const idea = await postIdea(base, { branch, interest, variant });
        ok += 1;
        lines.push(`- \`${branch}\` · ${interest} · v${variant} — **${idea.title}** (${idea.source})`);
        console.log(
          `[${ok + failed}/${total}] ${branch} | ${interest} | v${variant} → ${idea.title} (${idea.source})`,
        );
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        lines.push(`- \`${branch}\` · ${interest} · v${variant} — FAILED: ${message}`);
        console.log(`[${ok + failed}/${total}] ${branch} | ${interest} | v${variant} → FAILED: ${message}`);
      }
    }
  }

  const reviewsDir = path.resolve(import.meta.dirname, "../reviews");
  await mkdir(reviewsDir, { recursive: true });
  const review = [
    "# Idea bank review",
    "",
    `Generated ${new Date().toISOString()} against ${base}.`,
    "",
    `${ok} of ${total} combinations succeeded. Sources: \`ai\` = Workers AI, \`bank\` = static fallback.`,
    "",
    ...lines,
    "",
  ].join("\n");
  await writeFile(path.join(reviewsDir, "idea-bank-review.md"), review, "utf8");

  console.log(`Done: ${ok}/${total} succeeded. Report: reviews/idea-bank-review.md`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
