/**
 * WS2 — quality filter for generated ideas: reject anything that needs a paid
 * API, hardware, or more than 60 minutes to build. Keyword-based on purpose:
 * simple, deterministic and easy to test.
 */

export interface IdeaText {
  title: string;
  pitch: string;
  steps: readonly string[];
  tools: readonly string[];
  deployLine: string;
}

export type QualityIssue = "paid-api" | "hardware" | "over-60-minutes";

const PAID_API_PATTERNS: readonly RegExp[] = [
  /\bpaid\b/i,
  /\bpremium\b/i,
  /\bsubscription\b/i,
  /\bcredit card\b/i,
  /\bbilling\b/i,
];

const HARDWARE_PATTERNS: readonly RegExp[] = [
  /\bhardware\b/i,
  /\barduino\b/i,
  /\braspberry pi\b/i,
  /\besp32\b/i,
  /\besp8266\b/i,
  /\bsensors?\b/i,
  /\bcameras?\b/i,
  /\bmicrophones?\b/i,
  /\bdrone\b/i,
  /\brobots?\b/i,
  /\biot\b/i,
  /\bpcb\b/i,
  /\bsolder(?:ing)?\b/i,
  /\b3d print/i,
  /\bgps\b/i,
  /\brfid\b/i,
];

const OVER_60_PATTERNS: readonly RegExp[] = [
  /\b([2-9]|\d{2,})(?:\.\d+)?\s*(?:hours?|hrs?)\b/i,
  /\b(?:several|multiple|many|few|couple of)\s+(?:hours?|hrs?)\b/i,
  /\b(?:over|more than|longer than)\s+(?:an?|1)\s+hour\b/i,
  /\b(?:an?\s+)?hour\s+and\s+a\s+half\b/i,
  /\b(?:takes?|needs?|requires?|spend|spends?)\b[^.!?]{0,40}\b(?:days?|weeks?|months?)\b/i,
  /\b(?:days?|weeks?|months?)\b[^.!?]{0,40}\b(?:to (?:build|make|complete|finish)|of (?:building|work))\b/i,
];

const MINUTES_PATTERN = /\b(\d{1,4})\s*(?:minutes?|mins?)\b/gi;

function mentionsOverSixtyMinutes(text: string): boolean {
  if (OVER_60_PATTERNS.some((pattern) => pattern.test(text))) return true;
  for (const match of text.matchAll(MINUTES_PATTERN)) {
    if (Number(match[1]) > 60) return true;
  }
  return false;
}

export function qualityIssues(idea: IdeaText): QualityIssue[] {
  const text = [idea.title, idea.pitch, ...idea.steps, ...idea.tools, idea.deployLine].join("\n");
  const issues: QualityIssue[] = [];
  if (PAID_API_PATTERNS.some((pattern) => pattern.test(text))) issues.push("paid-api");
  if (HARDWARE_PATTERNS.some((pattern) => pattern.test(text))) issues.push("hardware");
  if (mentionsOverSixtyMinutes(text)) issues.push("over-60-minutes");
  return issues;
}

export function passesQualityFilter(idea: IdeaText): boolean {
  return qualityIssues(idea).length === 0;
}
