/**
 * WS2 — zod schema for the object the AI must return. The full IdeaCard is
 * assembled by the engine (key/branch/interest/variant/source are filled in).
 */
import { z } from "zod";

export const GeneratedIdeaSchema = z.object({
  title: z.string().min(3).max(80),
  pitch: z.string().min(10).max(220),
  steps: z.array(z.string().min(3).max(160)).length(3),
  tools: z.array(z.string().min(1).max(40)).min(2).max(5),
  deployLine: z.string().min(3).max(160),
});

export type GeneratedIdea = z.infer<typeof GeneratedIdeaSchema>;
