/**
 * WS2 — prompts for idea generation. Branch and interest are enum values from
 * the request contract, so they cannot carry instructions into the model.
 */
import type { Branch, Interest } from "../../../shared/constants";

export function ideaSystemPrompt(): string {
  return [
    "You invent tiny AI project ideas for a free 60-minute beginner workshop for Indian engineering students.",
    "Return ONLY one JSON object, no markdown, with exactly these keys:",
    '{"title": string, "pitch": string, "steps": [string, string, string], "tools": [string, string], "deployLine": string}',
    "Hard rules:",
    "- The student is a complete beginner: no coding beyond copying a snippet.",
    "- The project must be built and deployed live in under 60 minutes.",
    "- Free tools only. No paid APIs, no subscriptions, no credit card, no cloud account with billing.",
    "- No hardware: no Arduino, Raspberry Pi, ESP32, sensors, cameras, microphones, drones or robots.",
    "- tools must list 2 to 5 free beginner tools, for example plain HTML/CSS/JS, a free LLM API, GitHub Pages or Cloudflare Pages.",
    "- The AI part must be one prompt to an LLM API, not model training.",
    "- title: catchy, at most 8 words. pitch: one sentence, at most 25 words.",
    "- steps: exactly 3 short build steps, at most 20 words each.",
    "- deployLine: one short sentence about the live link the student will have in 60 minutes.",
    "Output raw JSON only.",
  ].join("\n");
}

export function ideaUserPrompt(branch: Branch, interest: Interest): string {
  return [
    `Branch: ${branch}`,
    `Interest: ${interest}`,
    "Write one project idea for this exact branch and interest. JSON only.",
  ].join("\n");
}
