/**
 * WS2 — idea engine tests: cache hit, AI failure/invalid JSON fallbacks,
 * zod-validated AI cards, quality filter, deterministic variants, rate limit
 * and the ai_call event.
 */
import { describe, expect, it, vi } from "vitest";
import { IDEA_CACHE_SECONDS } from "../../src/shared/constants";
import { IdeaCardSchema, type IdeaCard } from "../../src/shared/contracts";
import { getBankIdea } from "../../src/shared/idea-bank";
import type { AppEnv } from "../../src/worker/env";
import { BANK_CACHE_SECONDS } from "../../src/worker/lib/ideas/engine";
import app from "../../src/worker/routes/ideas";

const BRANCH = "CSE/IT/AI-ML" as const;
const INTEREST = "cricket" as const;
const CACHE_KEY = "idea:CSE/IT/AI-ML:cricket:0";

const VALID_IDEA = {
  title: "Gully Cricket Commentator",
  pitch: "Paste a score line and get a 30-second commentary script for your group chat.",
  steps: [
    "Add one input box for the score and teams",
    "Send it to a free LLM prompt template",
    "Add a copy button for sharing",
  ],
  tools: ["HTML + CSS", "A free LLM API", "GitHub Pages"],
  deployLine: "You deploy it live and share the link tonight.",
};

interface PutRecord {
  key: string;
  options: KVNamespacePutOptions | undefined;
}

function makeHarness(aiRun: () => Promise<unknown> | unknown) {
  const store = new Map<string, string>();
  const puts: PutRecord[] = [];
  const events: unknown[][] = [];
  const run = vi.fn(async () => aiRun());

  const kv = {
    get: async (key: string, type?: string) => {
      const value = store.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    put: async (key: string, value: string, options?: KVNamespacePutOptions) => {
      store.set(key, value);
      puts.push({ key, options });
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
    getWithMetadata: async () => ({ value: null, metadata: null, cacheStatus: null }),
  } as unknown as KVNamespace;

  const db = {
    prepare: () => ({
      bind: (...args: unknown[]) => ({
        run: async () => {
          events.push(args);
          return { success: true };
        },
      }),
    }),
  } as unknown as D1Database;

  const env = { CACHE: kv, AI: { run }, DB: db } as unknown as AppEnv;
  return { env, store, puts, events, run };
}

let ipSeq = 0;

async function preview(
  env: AppEnv,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<Response> {
  ipSeq += 1;
  return await app.request(
    "https://ship60.test/preview",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": `10.1.0.${ipSeq % 250}`,
        ...headers,
      },
      body: JSON.stringify(body),
    },
    env,
  );
}

describe("POST /api/ideas/preview", () => {
  it("returns a zod-valid AI card and caches it with the long TTL", async () => {
    const h = makeHarness(() => ({ response: JSON.stringify(VALID_IDEA) }));

    const res = await preview(h.env, { branch: BRANCH, interest: INTEREST, variant: 0 });
    expect(res.status).toBe(200);

    const body = await res.json<{ idea: IdeaCard }>();
    expect(body.idea.source).toBe("ai");
    expect(body.idea.key).toBe(CACHE_KEY);
    expect(IdeaCardSchema.safeParse(body.idea).success).toBe(true);
    expect(h.run).toHaveBeenCalledTimes(1);
    expect(h.store.has(CACHE_KEY)).toBe(true);
    expect(h.puts.find((p) => p.key === CACHE_KEY)?.options?.expirationTtl).toBe(
      IDEA_CACHE_SECONDS,
    );
  });

  it("serves the second identical request from KV without another AI call", async () => {
    const h = makeHarness(() => ({ response: JSON.stringify(VALID_IDEA) }));

    const first = await preview(h.env, { branch: BRANCH, interest: INTEREST, variant: 0 });
    const firstBody = await first.json<{ idea: IdeaCard }>();
    const second = await preview(h.env, { branch: BRANCH, interest: INTEREST, variant: 0 });
    const secondBody = await second.json<{ idea: IdeaCard }>();

    expect(second.status).toBe(200);
    expect(secondBody.idea).toEqual(firstBody.idea);
    expect(h.run).toHaveBeenCalledTimes(1);
  });

  it("falls back to the bank idea after an AI failure and retry", async () => {
    const h = makeHarness(() => {
      throw new Error("AI unavailable");
    });

    const res = await preview(h.env, { branch: BRANCH, interest: INTEREST, variant: 0 });
    const body = await res.json<{ idea: IdeaCard }>();

    expect(res.status).toBe(200);
    expect(body.idea.source).toBe("bank");
    expect(body.idea.title).toBe(getBankIdea(BRANCH, INTEREST).title);
    expect(h.run).toHaveBeenCalledTimes(2);
    expect(h.puts.find((p) => p.key === CACHE_KEY)?.options?.expirationTtl).toBe(
      BANK_CACHE_SECONDS,
    );
  });

  it("retries once on invalid AI JSON then falls back to the bank", async () => {
    const h = makeHarness(() => ({ response: "Sure! Here is an idea for you:" }));

    const res = await preview(h.env, { branch: BRANCH, interest: INTEREST, variant: 0 });
    const body = await res.json<{ idea: IdeaCard }>();

    expect(body.idea.source).toBe("bank");
    expect(h.run).toHaveBeenCalledTimes(2);
  });

  it("rejects a paid-API idea in the quality filter and falls back to the bank", async () => {
    const paidIdea = { ...VALID_IDEA, tools: ["Stripe paid API", "GitHub Pages"] };
    const h = makeHarness(() => ({ response: JSON.stringify(paidIdea) }));

    const res = await preview(h.env, { branch: BRANCH, interest: INTEREST, variant: 0 });
    const body = await res.json<{ idea: IdeaCard }>();

    expect(body.idea.source).toBe("bank");
    expect(body.idea.title).toBe(getBankIdea(BRANCH, INTEREST).title);
    expect(h.run).toHaveBeenCalledTimes(1);
  });

  it("rejects a hardware idea in the quality filter and falls back to the bank", async () => {
    const hardwareIdea = {
      ...VALID_IDEA,
      steps: ["Wire up an Arduino sensor", "Send readings to a free LLM", "Deploy the page"],
    };
    const h = makeHarness(() => ({ response: JSON.stringify(hardwareIdea) }));

    const res = await preview(h.env, { branch: BRANCH, interest: INTEREST, variant: 0 });
    const body = await res.json<{ idea: IdeaCard }>();

    expect(body.idea.source).toBe("bank");
    expect(h.run).toHaveBeenCalledTimes(1);
  });

  it("rejects an idea that needs more than 60 minutes", async () => {
    const slowIdea = { ...VALID_IDEA, deployLine: "Give it 2 hours and you are live." };
    const h = makeHarness(() => ({ response: JSON.stringify(slowIdea) }));

    const res = await preview(h.env, { branch: BRANCH, interest: INTEREST, variant: 0 });
    const body = await res.json<{ idea: IdeaCard }>();

    expect(body.idea.source).toBe("bank");
    expect(h.run).toHaveBeenCalledTimes(1);
  });

  it("picks a stable variant for the same anon seed", async () => {
    const h = makeHarness(() => ({ response: JSON.stringify(VALID_IDEA) }));

    const first = await preview(
      h.env,
      { branch: BRANCH, interest: INTEREST },
      { "x-anon-id": "student-a" },
    );
    const firstBody = await first.json<{ idea: IdeaCard }>();
    const second = await preview(
      h.env,
      { branch: BRANCH, interest: INTEREST },
      { "x-anon-id": "student-a" },
    );
    const secondBody = await second.json<{ idea: IdeaCard }>();

    expect(secondBody.idea.variant).toBe(firstBody.idea.variant);
    expect(h.run).toHaveBeenCalledTimes(1);
  });

  it("rate limits repeated cache-missing generations for one IP and combination", async () => {
    const h = makeHarness(() => ({ response: JSON.stringify(VALID_IDEA) }));
    const headers = { "cf-connecting-ip": "10.9.9.9" };

    let last: Response | null = null;
    for (let i = 0; i < 31; i++) {
      h.store.delete(CACHE_KEY);
      last = await preview(h.env, { branch: BRANCH, interest: INTEREST, variant: 0 }, headers);
      if (last.status === 429) break;
    }

    expect(last?.status).toBe(429);
    const body = await last?.json<{ error: { code: string } }>();
    expect(body?.error.code).toBe("RATE_LIMITED");
    expect(h.run).toHaveBeenCalledTimes(30);
  });

  it("records an ai_call event with kind/source/attempts/ms and no PII", async () => {
    const h = makeHarness(() => {
      throw new Error("AI unavailable");
    });

    await preview(h.env, { branch: BRANCH, interest: INTEREST, variant: 0 });

    expect(h.events).toHaveLength(1);
    const args = h.events[0];
    expect(args[1]).toBe("ai_call");
    const props = JSON.parse(String(args[5])) as Record<string, unknown>;
    expect(props).toEqual({
      kind: "idea",
      source: "bank",
      attempts: 2,
      ms: expect.any(Number),
    });
    expect(JSON.stringify(props)).not.toContain("10.1.0");
  });

  it("rejects an invalid branch with the error envelope", async () => {
    const h = makeHarness(() => ({ response: JSON.stringify(VALID_IDEA) }));

    const res = await preview(h.env, { branch: "Nope", interest: INTEREST });

    expect(res.status).toBe(400);
    const body = await res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(h.run).not.toHaveBeenCalled();
  });
});
