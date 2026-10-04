/**
 * Shared constants. Orchestrator-owned after Phase 0.
 * All campaign numbers live in plan.ts; this file holds product-wide literals.
 */

export const APP_NAME = "Ship60";

export const BRANCHES = ["CSE/IT/AI-ML", "ECE", "EEE", "Mech", "Civil", "Other"] as const;
export type Branch = (typeof BRANCHES)[number];

export const INTERESTS = [
  "cricket",
  "movies",
  "placements",
  "food",
  "money",
  "music",
  "college life",
  "health",
] as const;
export type Interest = (typeof INTERESTS)[number];

export const VARIANTS = [0, 1, 2] as const;

export const DEFAULT_GRAD_YEAR = 2027;
export const GRAD_YEARS = [2026, 2027, 2028, 2029, 2030] as const;

export const COOKIE_REF = "s60_ref";
export const COOKIE_TOKEN = "s60_token";
export const COOKIE_ADMIN = "s60_admin";
export const COOKIE_ANON = "s60_anon";

export const REF_COOKIE_DAYS = 30;
export const TOKEN_COOKIE_DAYS = 60;
export const ADMIN_SESSION_HOURS = 12;

export const LEADERBOARD_CACHE_SECONDS = 60;
export const STATS_CACHE_SECONDS = 60;
export const OG_CACHE_SECONDS = 3600;
export const IDEA_CACHE_SECONDS = 60 * 60 * 24 * 30;

export const RATE_LIMITS = {
  register: { limit: 5, windowSeconds: 3600 },
  ideas: { limit: 30, windowSeconds: 3600 },
  events: { limit: 120, windowSeconds: 3600 },
  submissions: { limit: 3, windowSeconds: 3600 },
  adminLogin: { limit: 10, windowSeconds: 3600 },
  referralLanding: { limit: 120, windowSeconds: 3600 },
} as const;

export const MAX_FLAGGED_IPS_PER_HOUR = 5;

export const WHATSAPP_VARIANTS = ["en", "te", "fomo"] as const;
export type WhatsAppVariant = (typeof WHATSAPP_VARIANTS)[number];

export const REWARD_TIERS = [
  { minReferrals: 1, label: "AI Project Prompt Pack", on: "referral" },
  { minReferrals: 3, label: "Priority Q&A in the live session", on: "referral" },
  { minReferrals: 5, label: "Campus Builder certificate", on: "qualified" },
] as const;

export const CASH_REWARD_TIERS = [
  { rank: 1, amount: 400 },
  { rank: 2, amount: 300 },
  { rank: 3, amount: 200 },
  { rankFrom: 4, rankTo: 10, amount: 100 },
] as const;

export const EVENT_TYPES = [
  "page_view",
  "idea_generated",
  "form_started",
  "registered",
  "share_clicked",
  "referral_landing",
  "checkin",
  "submitted",
  "ai_call",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/**
 * Event types a public client may emit. Server-derived events (`registered`,
 * `checkin`, `submitted`, `ai_call`) are rejected on POST /api/events so public
 * traffic cannot fabricate admin metrics (security review M3).
 */
export const CLIENT_EVENT_TYPES = [
  "page_view",
  "idea_generated",
  "form_started",
  "share_clicked",
  "referral_landing",
] as const;
export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

export const SERVER_EVENT_TYPES = [
  "registered",
  "checkin",
  "submitted",
  "ai_call",
] as const satisfies readonly EventType[];

export const MAX_EVENT_PROPS_BYTES = 1024;

export const FUNNEL_STEPS = [
  { key: "page_view", label: "Landing views" },
  { key: "idea_generated", label: "Idea generated" },
  { key: "form_started", label: "Form started" },
  { key: "registered", label: "Registered" },
  { key: "share_clicked", label: "Shared" },
  { key: "referral_landing", label: "Referral landings" },
  { key: "referral_registered", label: "Referral registrations" },
] as const;

export const AI_MODELS = {
  ideas: "@cf/meta/llama-3.1-8b-instruct-fast",
  evaluator: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  brief: "@cf/meta/llama-3.1-8b-instruct-fast",
} as const;

export const AI_TIMEOUT_MS = 4000;

export const DISPOSABLE_EMAIL_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "sharklasers.com",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "fakeinbox.com",
] as const;

export const CONSENT_TEXT =
  "I agree to NxtWave storing my name, email, WhatsApp number, college and branch to run this free workshop and share workshop updates with me. I can ask for deletion anytime.";

export const SIMULATED_LABEL = "Simulated data";
