/**
 * Safe probe of the student's deployed URL (PRD M9).
 * http/https only, standard ports, manual redirects re-validated per hop,
 * 5 s timeout, 200 KB body cap.
 */
import { readCappedText } from "./limit";
import { validateTargetUrl } from "./ssrf";

export interface LiveProbe {
  ok: boolean;
  url: string;
  finalUrl: string | null;
  status: number | null;
  title: string | null;
  responseMs: number | null;
  bytes: number;
  error: string | null;
}

const TIMEOUT_MS = 5_000;
const MAX_BYTES = 200 * 1024;
const MAX_REDIRECTS = 3;
const USER_AGENT = "Ship60Bot/1.0 (+https://ship60.dev; project check)";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export async function probeLivePage(rawUrl: string): Promise<LiveProbe> {
  const base: LiveProbe = {
    ok: false,
    url: rawUrl,
    finalUrl: null,
    status: null,
    title: null,
    responseMs: null,
    bytes: 0,
    error: null,
  };

  let target = validateTargetUrl(rawUrl);
  if (!target.ok) return { ...base, error: target.reason };

  const started = Date.now();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let response: Response;
    try {
      response = await fetch(target.url.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "user-agent": USER_AGENT },
      });
    } catch (error) {
      return {
        ...base,
        finalUrl: target.url.toString(),
        responseMs: Date.now() - started,
        error: timeoutLike(error) ? "The page took too long to respond." : "The page could not be reached.",
      };
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        return { ...base, finalUrl: target.url.toString(), status: response.status, responseMs: Date.now() - started, error: "Redirect without a destination." };
      }
      const next = validateTargetUrl(new URL(location, target.url).toString());
      if (!next.ok) {
        return { ...base, finalUrl: target.url.toString(), status: response.status, responseMs: Date.now() - started, error: next.reason };
      }
      target = next;
      continue;
    }

    let body = "";
    try {
      body = await readCappedText(response, MAX_BYTES);
    } catch (error) {
      if (timeoutLike(error)) {
        return { ...base, finalUrl: target.url.toString(), status: response.status, responseMs: Date.now() - started, error: "The page took too long to respond." };
      }
    }

    return {
      ok: true,
      url: rawUrl,
      finalUrl: target.url.toString(),
      status: response.status,
      title: extractTitle(body),
      responseMs: Date.now() - started,
      bytes: Math.min(body.length, MAX_BYTES),
      error: null,
    };
  }

  return { ...base, error: "Too many redirects." };
}

export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const title = match[1].replace(/\s+/g, " ").trim();
  return title.length > 0 ? title.slice(0, 140) : null;
}

function timeoutLike(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "TimeoutError" || error.name === "AbortError";
}
