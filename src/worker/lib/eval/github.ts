/**
 * GitHub repo metadata + README via the REST API (PRD M9).
 * Optional GITHUB_TOKEN lifts rate limits. README is capped at 50 KB and is
 * always treated as untrusted data by the evaluator.
 */
import { decodeBase64Utf8, readCappedText } from "./limit";

export interface RepoContext {
  ok: boolean;
  owner: string | null;
  repo: string | null;
  fullName: string | null;
  description: string | null;
  language: string | null;
  stars: number | null;
  pushedAt: string | null;
  sizeKb: number | null;
  hasReadme: boolean;
  readme: string | null;
  error: string | null;
}

const TIMEOUT_MS = 5_000;
const README_BYTES = 50 * 1024;
const USER_AGENT = "Ship60Bot/1.0";
const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

export function parseGithubRepo(rawUrl: string): { owner: string; repo: string } | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!GITHUB_HOSTS.has(url.hostname.toLowerCase())) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return null;
  return { owner, repo };
}

function failure(owner: string | null, repo: string | null, error: string): RepoContext {
  return {
    ok: false,
    owner,
    repo,
    fullName: owner && repo ? `${owner}/${repo}` : null,
    description: null,
    language: null,
    stars: null,
    pushedAt: null,
    sizeKb: null,
    hasReadme: false,
    readme: null,
    error,
  };
}

export async function fetchRepoContext(rawUrl: string, token?: string): Promise<RepoContext> {
  const parsed = parseGithubRepo(rawUrl);
  if (!parsed) {
    return failure(null, null, "Only GitHub repository links can be read.");
  }
  const { owner, repo } = parsed;
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": USER_AGENT,
    "x-github-api-version": "2022-11-28",
  };
  if (token) headers.authorization = `Bearer ${token}`;

  let meta: Record<string, unknown>;
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      return failure(owner, repo, `GitHub returned ${response.status} for ${owner}/${repo}.`);
    }
    meta = (await response.json()) as Record<string, unknown>;
  } catch (error) {
    return failure(owner, repo, timeoutLike(error) ? "GitHub took too long to respond." : "GitHub could not be reached.");
  }

  const context: RepoContext = {
    ok: true,
    owner,
    repo,
    fullName: typeof meta.full_name === "string" ? meta.full_name : `${owner}/${repo}`,
    description: typeof meta.description === "string" ? meta.description : null,
    language: typeof meta.language === "string" ? meta.language : null,
    stars: typeof meta.stargazers_count === "number" ? meta.stargazers_count : null,
    pushedAt: typeof meta.pushed_at === "string" ? meta.pushed_at : null,
    sizeKb: typeof meta.size === "number" ? meta.size : null,
    hasReadme: false,
    readme: null,
    error: null,
  };

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      context.error = `README not available (GitHub ${response.status}).`;
      return context;
    }
    const raw = await readCappedText(response, README_BYTES * 2);
    const payload = JSON.parse(raw) as { content?: unknown; encoding?: unknown };
    if (typeof payload.content !== "string") {
      context.error = "README was empty.";
      return context;
    }
    const text =
      payload.encoding === "base64" ? decodeBase64Utf8(payload.content) : payload.content;
    context.hasReadme = true;
    context.readme = text.slice(0, README_BYTES);
    return context;
  } catch (error) {
    context.error = timeoutLike(error) ? "README took too long to load." : "README could not be read.";
    return context;
  }
}

function timeoutLike(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "TimeoutError" || error.name === "AbortError";
}
