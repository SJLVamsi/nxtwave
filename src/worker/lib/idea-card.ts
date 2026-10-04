/**
 * Reconstruct an IdeaCard from `users.idea_key`, which is the only idea data the
 * registration insert persists (no extra column in PRD §6.4).
 *
 * WS2 stores keys as `branch|interest` or `branch|interest|variant`; a JSON blob
 * is also accepted so a stored full card survives. Falls back to the static bank,
 * which covers every branch × interest (Phase 0, decision P0.8).
 */
import { BRANCHES, INTERESTS, type Branch, type Interest } from "../../shared/constants";
import { IdeaCardSchema, type IdeaCard } from "../../shared/contracts";
import { IDEA_BANK } from "../../shared/idea-bank";

function parseJsonCard(key: string): IdeaCard | null {
  let raw: unknown;
  try {
    raw = JSON.parse(key);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const candidate = { ...(raw as Record<string, unknown>) };
  if (candidate.source !== "ai" && candidate.source !== "bank") candidate.source = "bank";
  const parsed = IdeaCardSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function resolveIdeaCard(key: string | null | undefined): IdeaCard | null {
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) return parseJsonCard(trimmed);

  const [branchRaw, interestRaw, variantRaw] = trimmed.split("|");
  const branch: Branch | null = (BRANCHES as readonly string[]).includes(branchRaw)
    ? (branchRaw as Branch)
    : null;
  const interest: Interest | null = (INTERESTS as readonly string[]).includes(interestRaw)
    ? (interestRaw as Interest)
    : null;
  if (!branch || !interest) return null;

  const idea = IDEA_BANK[`${branch}|${interest}`];
  if (!idea) return null;

  const variantNumber = Number(variantRaw);
  const variant = variantNumber === 1 || variantNumber === 2 ? variantNumber : 0;

  const parsed = IdeaCardSchema.safeParse({
    key: trimmed,
    branch,
    interest,
    variant,
    title: idea.title,
    pitch: idea.pitch,
    steps: idea.steps,
    tools: idea.tools,
    deployLine: idea.deployLine,
    source: "bank",
  });
  return parsed.success ? parsed.data : null;
}
