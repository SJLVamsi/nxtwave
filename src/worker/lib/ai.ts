/**
 * Workers AI wrapper: hard timeout, JSON extraction, zod validation, one retry,
 * and a deterministic non-AI fallback. Every call is reported through onResult
 * so routes can record an `ai_call` event.
 */
import { AI_TIMEOUT_MS } from "../../shared/constants";

export interface AiJsonOptions<T> {
  ai: Ai;
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  schema: {
    safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: unknown };
  };
  fallback: () => T;
  timeoutMs?: number;
  retries?: number;
  maxTokens?: number;
  temperature?: number;
  onResult?: (info: { source: "ai" | "fallback"; attempts: number; ms: number }) => void;
}

export interface AiJsonResult<T> {
  data: T;
  source: "ai" | "fallback";
  attempts: number;
  ms: number;
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function runOnce(
  options: AiJsonOptions<unknown>,
  timeoutMs: number,
): Promise<unknown | null> {
  const call = options.ai.run(options.model as never, {
    messages: options.messages,
    max_tokens: options.maxTokens ?? 800,
    temperature: options.temperature ?? 0.7,
  } as never) as Promise<{ response?: string }>;

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  const result = await Promise.race([call.catch(() => null), timeout]);
  if (!result || typeof result.response !== "string") return null;
  return extractJson(result.response);
}

export async function runAiJson<T>(options: AiJsonOptions<T>): Promise<AiJsonResult<T>> {
  const started = Date.now();
  const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;
  const retries = options.retries ?? 1;
  let attempts = 0;

  for (let i = 0; i <= retries; i++) {
    attempts++;
    try {
      const raw = await runOnce(options as AiJsonOptions<unknown>, timeoutMs);
      if (raw !== null) {
        const parsed = options.schema.safeParse(raw);
        if (parsed.success) {
          const ms = Date.now() - started;
          options.onResult?.({ source: "ai", attempts, ms });
          return { data: parsed.data, source: "ai", attempts, ms };
        }
      }
    } catch {
      // fall through to retry / fallback
    }
  }

  const ms = Date.now() - started;
  options.onResult?.({ source: "fallback", attempts, ms });
  return { data: options.fallback(), source: "fallback", attempts, ms };
}
