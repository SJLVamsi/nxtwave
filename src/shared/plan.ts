/**
 * The growth plan as numbers (PRD §3). The /plan deck, the admin pacing chart
 * and the simulator all read from here so they can never disagree.
 * Orchestrator-owned after Phase 0.
 */

export const TARGET_REGISTRATIONS = 500;
export const PLANNED_REGISTRATIONS = 520;

export const CHANNELS = [
  {
    id: "ambassadors",
    label: "Ambassadors → WhatsApp groups",
    mechanism: "20 ambassadors × 2.5 groups × ~70 members",
    reach: 3500,
    conversion: 0.07,
    registrations: 245,
    priority: 1,
  },
  {
    id: "referral",
    label: "Registrant referral loop",
    mechanism: "k ≈ 0.27 on the 410 non-referral registrations",
    reach: 0,
    conversion: 0,
    registrations: 110,
    priority: 2,
  },
  {
    id: "clubs",
    label: "Tech club co-hosts",
    mechanism: "6 clubs × ~300 members",
    reach: 1800,
    conversion: 0.045,
    registrations: 80,
    priority: 3,
  },
  {
    id: "owned",
    label: "Owned + organic",
    mechanism: "LinkedIn, NxtWave community, one reel",
    reach: 3000,
    conversion: 0.02,
    registrations: 60,
    priority: 4,
  },
  {
    id: "boost",
    label: "Boost test (Day 4)",
    mechanism: "₹400 on a post that already outperformed organically",
    reach: 0,
    conversion: 0,
    registrations: 25,
    priority: 5,
  },
] as const;

export const REFERRAL_K_FACTOR = 0.27;

/** Cumulative registrations target by campaign day (index 0 = Day 1). */
export const PACING = [40, 110, 190, 270, 350, 440, 520] as const;

export const BUDGET = [
  {
    item: "Top-referrer reward pool",
    amount: 1600,
    rule: "#1 ₹400, #2 ₹300, #3 ₹200, #4–#10 ₹100 each, paid by UPI after the workshop on qualified referrals only",
  },
  {
    item: "Day 4 boost test",
    amount: 400,
    rule: "Only on a post that already outperformed organically. Kill if cost per registration > ₹15.",
  },
  { item: "Infrastructure", amount: 0, rule: "Cloudflare free tier, Workers AI free allocation" },
] as const;

export const BUDGET_TOTAL = BUDGET.reduce((sum, b) => sum + b.amount, 0);
export const COST_PER_REGISTRATION_CEILING = 4;

export const CALENDAR = [
  {
    day: 1,
    weekday: "Mon",
    action: "Recruit and onboard 20 ambassadors (15-min call + kit). Seed in NxtWave community.",
    cumulative: 40,
  },
  {
    day: 2,
    weekday: "Tue",
    action: "Ambassador wave 1: posts in 2–3 class groups each, 8–10 PM.",
    cumulative: 110,
  },
  {
    day: 3,
    weekday: "Wed",
    action:
      "Club co-host announcements. College leaderboard goes public. Checkpoint: below 150 → recruit 10 more ambassadors at zero-registration colleges.",
    cumulative: 190,
  },
  {
    day: 4,
    weekday: "Thu",
    action: "Proof drop: 45-second screen recording of a project being built. Boost test.",
    cumulative: 270,
  },
  {
    day: 5,
    weekday: "Fri",
    action: "Referral nudge to all registrants (“you're 2 away from the Prompt Pack”).",
    cumulative: 350,
  },
  {
    day: 6,
    weekday: "Sat",
    action: "Ambassador wave 2 with social proof (“380 students from 24 colleges”).",
    cumulative: 440,
  },
  {
    day: 7,
    weekday: "Sun",
    action: "Morning last call. Reminders 2 h and 15 min before. Live check-in qualifies referrals.",
    cumulative: 520,
  },
] as const;

export const STUDENT_SEGMENTS = {
  primary:
    "Final-year B.Tech students (graduating 2027) in tier-2/3 engineering colleges in Telangana and Andhra Pradesh, ~25 colleges around Hyderabad, Vizag and Vijayawada. CSE / IT / AI-ML / Data Science first, then ECE / EEE.",
  secondary:
    "Campus ambassadors: class reps, placement coordinators and tech club leads who already admin WhatsApp groups of 60–200 classmates. 20–30 carry most of the campaign.",
  excluded: "1st/2nd years and working professionals: can register, tagged and excluded from the 500 target and rewards.",
} as const;

export const PLAN_INSIGHT =
  "The bottleneck for 500 registrations is not a landing page, it is distribution through trust. Students register when a classmate drops a link in a group they already trust, not when they see an ad.";

export const REJECTED_CHANNELS = [
  "Paid ads as a main channel — ₹2,000 buys too little reach to hit 500 alone.",
  "Cold email blasts — no consented list, spam risk, low trust.",
  "Influencer collaborations — cost and timeline.",
] as const;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Planned cumulative by day index (1-based). Returns 0 before Day 1. */
export function plannedCumulative(day: number): number {
  if (day < 1) return 0;
  const idx = Math.min(Math.floor(day), PACING.length) - 1;
  return PACING[Math.max(0, idx)];
}

/**
 * Project the day-7 total from the current run rate.
 * dayFraction: elapsed campaign days (e.g. 3.5); actual: registrations so far.
 */
export function projectFinalTotal(actual: number, dayFraction: number): number {
  if (dayFraction <= 0.25) return actual;
  const runRate = actual / dayFraction;
  return Math.round(runRate * PACING.length);
}
