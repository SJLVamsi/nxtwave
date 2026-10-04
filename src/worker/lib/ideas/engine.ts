/**
 * WS2 — idea engine. KV-cached idea cards: Workers AI generation validated with
 * zod, static-bank fallback, quality filter, per-combination rate limiting and
 * an `ai_call` event per generation. Cache is global, so total AI generations
 * for ideas stay bounded at 6×8×3 = 144 per cache lifetime.
 */
import { AI_MODELS, AI_TIMEOUT_MS, IDEA_CACHE_SECONDS, RATE_LIMITS } from "../../../shared/constants";
import type { Branch, Interest } from "../../../shared/constants";
import { IdeaCardSchema, type IdeaCard } from "../../../shared/contracts";
import { getBankIdea } from "../../../shared/idea-bank";
import type { AppEnv } from "../../env";
import { runAiJson } from "../ai";
import { recordEvent } from "../events";
import { rateLimit, type RateLimitResult } from "../ratelimit";
import { ideaSystemPrompt, ideaUserPrompt } from "./prompt";
import { passesQualityFilter } from "./quality";
import { GeneratedIdeaSchema, type GeneratedIdea } from "./schema";

/** Bank fallbacks are cached briefly so a later request can retry AI. */
export const BANK_CACHE_SECONDS = 60 * 60;

export interface IdeaInput {
  branch: Branch;
  interest: Interest;
  variant: 0 | 1 | 2;
  ipHash: string;
}

export type IdeaPreviewResult =
  | { kind: "ok"; idea: IdeaCard; cacheHit: boolean }
  | { kind: "rate_limited"; resetAt: number };

export function ideaCacheKey(branch: Branch, interest: Interest, variant: 0 | 1 | 2): string {
  return `idea:${branch}:${interest}:${variant}`;
}

/** Stable FNV-1a choice of variant, so repeat visitors keep their card. */
export function pickVariant(seed: string): 0 | 1 | 2 {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 3) as 0 | 1 | 2;
}

function bankAsGenerated(branch: Branch, interest: Interest): GeneratedIdea {
  const bank = getBankIdea(branch, interest);
  return {
    title: bank.title,
    pitch: bank.pitch,
    steps: [...bank.steps],
    tools: [...bank.tools],
    deployLine: bank.deployLine,
  };
}

function bankCard(input: IdeaInput): IdeaCard {
  const bank = getBankIdea(input.branch, input.interest);
  return {
    key: ideaCacheKey(input.branch, input.interest, input.variant),
    branch: input.branch,
    interest: input.interest,
    variant: input.variant,
    title: bank.title,
    pitch: bank.pitch,
    steps: [...bank.steps],
    tools: [...bank.tools],
    deployLine: bank.deployLine,
    source: "bank",
  };
}

export async function getIdeaPreview(env: AppEnv, input: IdeaInput): Promise<IdeaPreviewResult> {
  const key = ideaCacheKey(input.branch, input.interest, input.variant);

  const cached = await readCachedIdea(env, key);
  if (cached) return { kind: "ok", idea: cached, cacheHit: true };

  const limited = await checkRateLimit(env, input);
  if (limited && !limited.ok) return { kind: "rate_limited", resetAt: limited.resetAt };

  const ai = await runAiJson<GeneratedIdea>({
    ai: env.AI,
    model: AI_MODELS.ideas,
    messages: [
      { role: "system", content: ideaSystemPrompt() },
      { role: "user", content: ideaUserPrompt(input.branch, input.interest) },
    ],
    schema: GeneratedIdeaSchema,
    fallback: () => bankAsGenerated(input.branch, input.interest),
    timeoutMs: AI_TIMEOUT_MS,
    retries: 1,
    maxTokens: 500,
    temperature: 0.85,
  });

  const accepted = ai.source === "ai" && passesQualityFilter(ai.data);
  const idea: IdeaCard = accepted
    ? {
        key,
        branch: input.branch,
        interest: input.interest,
        variant: input.variant,
        ...ai.data,
        source: "ai",
      }
    : bankCard(input);

  const ttl = idea.source === "ai" ? IDEA_CACHE_SECONDS : BANK_CACHE_SECONDS;
  await writeCachedIdea(env, key, idea, ttl);
  await safeRecordAiCall(env, { source: idea.source, attempts: ai.attempts, ms: ai.ms });

  return { kind: "ok", idea, cacheHit: false };
}

async function readCachedIdea(env: AppEnv, key: string): Promise<IdeaCard | null> {
  try {
    const raw = await env.CACHE.get(key, "json");
    if (raw === null) return null;
    const parsed = IdeaCardSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function writeCachedIdea(
  env: AppEnv,
  key: string,
  idea: IdeaCard,
  ttlSeconds: number,
): Promise<void> {
  try {
    await env.CACHE.put(key, JSON.stringify(idea), { expirationTtl: ttlSeconds });
  } catch (error) {
    console.error("idea cache write failed", error);
  }
}

/**
 * Rate limit is checked only when we are about to call AI (cache misses) and is
 * keyed by IP hash + combination. A full 144-combination warm does 3 misses per
 * combination, so it passes while a retry storm on one card is capped; total AI
 * generations remain globally bounded by the cache.
 */
async function checkRateLimit(env: AppEnv, input: IdeaInput): Promise<RateLimitResult | null> {
  try {
    return await rateLimit(
      env.CACHE,
      `idea:${input.ipHash}:${input.branch}:${input.interest}`,
      RATE_LIMITS.ideas.limit,
      RATE_LIMITS.ideas.windowSeconds,
    );
  } catch {
    return null;
  }
}

async function safeRecordAiCall(
  env: AppEnv,
  info: { source: "ai" | "bank"; attempts: number; ms: number },
): Promise<void> {
  try {
    await recordEvent(env.DB, {
      type: "ai_call",
      props: { kind: "idea", source: info.source, attempts: info.attempts, ms: info.ms },
    });
  } catch (error) {
    console.error("idea ai_call event failed", error);
  }
}
