/**
 * WS8 — deterministic Ship60 simulator + seeder (PRD M13, PRD §3).
 *
 * Generates the whole demo dataset from a fixed PRNG seed (mulberry32), writes it
 * as batched SQL and applies it to D1 through `wrangler d1 execute --file`.
 * Every generated row carries `is_simulated = 1`. Student names are invented;
 * emails use @example.com and phones use the +91 90000xxxxx reserved pattern, so
 * nothing can reach a real person.
 *
 * Usage:
 *   tsx scripts/seed.ts --local              # apply to local D1 (default)
 *   tsx scripts/seed.ts --remote --confirm   # apply to remote D1
 *   tsx scripts/seed.ts --clear              # delete simulated rows only
 *
 * The seed is idempotent: it deletes simulated rows (children first), upserts the
 * real college list, and re-inserts the same dataset. Two runs produce the same
 * fingerprint, totals and pacing.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BRANCHES, INTERESTS, WHATSAPP_VARIANTS, type Branch } from "../src/shared/constants";
import { IDEA_BANK } from "../src/shared/idea-bank";
import {
  CHANNELS,
  DAY_MS,
  PACING,
  PLANNED_REGISTRATIONS,
  REFERRAL_K_FACTOR,
} from "../src/shared/plan";
import { COLLEGES, FIRST_NAMES, LAST_NAMES, USER_AGENTS, type SeedCollege } from "./seed-data";

/* --------------------------------- config --------------------------------- */

const PRNG_SEED = 60; // "Ship60"
const DB_NAME = "ship60-db";
const AMBASSADOR_COUNT = 20;
const CHECKIN_RATE = 0.45;
const SUBMISSION_TARGET = 120;
const FLAG_COUNT = 12;
const MAX_REFERRALS_PER_REFERRER = 8;
const MAX_STATEMENT_CHUNK_BYTES = 75_000;

/** Day 1 = Monday 2026-10-05; Day 7 = Sunday 2026-10-11 (workshop, 19:00 IST). */
const CAMPAIGN_START_MS = Date.UTC(2026, 9, 5);
const WORKSHOP_DAY_MS = CAMPAIGN_START_MS + 6 * DAY_MS;

const CHANNEL_TARGETS = CHANNELS.map((c) => ({
  id: c.id,
  label: c.label,
  target: c.registrations,
}));
const STUDENT_COUNT = CHANNEL_TARGETS.reduce((sum, c) => sum + c.target, 0);

type ChannelId = (typeof CHANNELS)[number]["id"];
type FlagStatus = "open" | "approved" | "rejected";
type ShareVariant = (typeof WHATSAPP_VARIANTS)[number];

/* ---------------------------------- prng ---------------------------------- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(PRNG_SEED);

function rint(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

function weightedPick<T>(items: readonly { value: T; weight: number }[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rand() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

/* --------------------------------- helpers -------------------------------- */

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

const REF_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const usedRefCodes = new Set<string>();

function makeRefCode(name: string): string {
  const base =
    (name.split(" ")[0] ?? "SHIP")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 8) || "SHIP";
  for (let attempt = 0; attempt < 200; attempt++) {
    let suffix = "";
    for (let i = 0; i < 3; i++) {
      suffix += REF_CODE_ALPHABET[Math.floor(rand() * REF_CODE_ALPHABET.length)];
    }
    const code = `${base}${suffix}`;
    if (!usedRefCodes.has(code)) {
      usedRefCodes.add(code);
      return code;
    }
  }
  throw new Error(`could not generate a unique ref code for ${name}`);
}

const BRANCH_WEIGHTS: readonly { value: Branch; weight: number }[] = [
  { value: "CSE/IT/AI-ML", weight: 52 },
  { value: "ECE", weight: 20 },
  { value: "EEE", weight: 10 },
  { value: "Mech", weight: 8 },
  { value: "Civil", weight: 5 },
  { value: "Other", weight: 5 },
];

const GRAD_YEAR_WEIGHTS = [
  { value: 2026, weight: 8 },
  { value: 2027, weight: 68 },
  { value: 2028, weight: 16 },
  { value: 2029, weight: 5 },
  { value: 2030, weight: 3 },
];

/* ------------------------------- generated rows ---------------------------- */

interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone: string;
  collegeId: string;
  refCode: string;
  tokenHash: string;
  seatNo: number;
  userAgent: string;
  createdAtMs: number;
}

/** Unique keys already used by real (non-simulated) rows, so the seed never clobbers them. */
interface ExistingReservations {
  maxSeat: number;
  emails: Set<string>;
  phones: Set<string>;
  refCodes: Set<string>;
}

interface Submission {
  id: string;
  userId: string;
  liveUrl: string;
  repoUrl: string;
  description: string;
  score: number;
  evaluation: Evaluation;
  certId: string;
  createdAtMs: number;
}

interface Evaluation {
  score: number;
  breakdown: {
    worksLive: number;
    meaningfulAi: number;
    problemClarity: number;
    readmeHygiene: number;
    originality: number;
  };
  strengths: string[];
  improvements: string[];
  nextFeature: string;
}

interface Student {
  id: string;
  seatNo: number;
  name: string;
  email: string;
  phone: string;
  collegeId: string;
  branch: Branch;
  gradYear: number;
  refCode: string;
  referredBy: string | null;
  referrerRefCode: string | null;
  tokenHash: string;
  ideaKey: string;
  channel: ChannelId;
  utmSource: string;
  utmMedium: string;
  utmContent: string | null;
  shareVariant: ShareVariant | null;
  ipHash: string;
  userAgent: string;
  flagReason: string | null;
  flagStatus: FlagStatus | null;
  createdAtMs: number;
  day: number;
  checkedIn: boolean;
  checkedInAtMs: number | null;
  submission: Submission | null;
}

interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  status: "pending" | "qualified" | "rejected";
  createdAtMs: number;
  qualifiedAtMs: number | null;
}

interface Checkin {
  userId: string;
  checkedInAtMs: number;
}

interface SimEvent {
  id: string;
  type: string;
  anonId: string | null;
  userId: string | null;
  refCode: string | null;
  props: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAtMs: number;
}

/* ------------------------------- generation -------------------------------- */

function plannedDaily(): number[] {
  return PACING.map((value, index) => (index === 0 ? value : value - PACING[index - 1]));
}

function dailyTotalsWithNoise(): number[] {
  const planned = plannedDaily();
  const noisy = planned.map((value, index) =>
    index < planned.length - 1 ? Math.max(12, value + rint(-8, 8)) : 0,
  );
  noisy[noisy.length - 1] = STUDENT_COUNT - noisy.slice(0, -1).reduce((sum, v) => sum + v, 0);
  return noisy;
}

/** Largest-remainder allocation so per-day sums and per-channel totals both hold. */
function allocateChannelsAcrossDays(dailyTotals: number[]): ChannelId[][] {
  const remaining = new Map<ChannelId, number>(
    CHANNEL_TARGETS.map((c) => [c.id as ChannelId, c.target]),
  );
  const perDay: ChannelId[][] = [];
  for (let day = 0; day < dailyTotals.length; day++) {
    const dayCount = dailyTotals[day];
    const pool = CHANNEL_TARGETS.filter((c) => (remaining.get(c.id as ChannelId) ?? 0) > 0);
    const totalRemaining = pool.reduce(
      (sum, c) => sum + (remaining.get(c.id as ChannelId) ?? 0),
      0,
    );
    if (totalRemaining === 0)
      throw new Error("channel allocation exhausted before the campaign ended");

    const additions = new Map<ChannelId, number>();
    let allocated = 0;
    for (const c of pool) {
      const id = c.id as ChannelId;
      const exact = ((remaining.get(id) ?? 0) * dayCount) / totalRemaining;
      const base = Math.floor(exact);
      additions.set(id, base);
      allocated += base;
    }

    let leftover = dayCount - allocated;
    const fractions = pool
      .map((c) => {
        const id = c.id as ChannelId;
        const exact = ((remaining.get(id) ?? 0) * dayCount) / totalRemaining;
        return {
          id,
          frac: exact - (additions.get(id) ?? 0),
          order: CHANNEL_TARGETS.findIndex((t) => t.id === id),
        };
      })
      .sort((a, b) => b.frac - a.frac || a.order - b.order);
    let cursor = 0;
    while (leftover > 0) {
      const id = fractions[cursor % fractions.length].id;
      if ((remaining.get(id) ?? 0) > (additions.get(id) ?? 0)) {
        additions.set(id, (additions.get(id) ?? 0) + 1);
        leftover--;
      }
      cursor++;
      if (cursor > 10_000) throw new Error("channel allocation did not converge");
    }

    const list: ChannelId[] = [];
    for (const c of CHANNEL_TARGETS) {
      const id = c.id as ChannelId;
      const count = additions.get(id) ?? 0;
      for (let i = 0; i < count; i++) list.push(id);
      remaining.set(id, (remaining.get(id) ?? 0) - count);
    }
    perDay.push(shuffle(list));
  }
  return perDay;
}

function generate(existing: ExistingReservations): {
  ambassadors: Ambassador[];
  students: Student[];
  referrals: Referral[];
  checkins: Checkin[];
  submissions: Submission[];
  events: SimEvent[];
  dailyTotals: number[];
} {
  for (const code of existing.refCodes) usedRefCodes.add(code);
  const usedPhones = new Set(existing.phones);
  const usedEmails = new Set(existing.emails);
  let phoneSlot = 0;

  function nextPhone(): string {
    let phone: string;
    do {
      phoneSlot++;
      if (phoneSlot > 99_999) throw new Error("reserved phone space exhausted");
      phone = `+91 90000${String(phoneSlot).padStart(5, "0")}`;
    } while (usedPhones.has(phone));
    usedPhones.add(phone);
    return phone;
  }

  function uniqueEmail(base: string): string {
    let candidate = base;
    let attempt = 1;
    while (usedEmails.has(candidate)) {
      attempt++;
      candidate = base.replace(/@example\.com$/, `.${attempt}@example.com`);
    }
    usedEmails.add(candidate);
    return candidate;
  }

  const dailyTotals = dailyTotalsWithNoise();
  const perDayChannels = allocateChannelsAcrossDays(dailyTotals);

  /* Ambassadors: Day 1, spread over 20 real colleges. */
  const allNames = shuffle(
    FIRST_NAMES.flatMap((first) => LAST_NAMES.map((last) => `${first} ${last}`)),
  );
  let nameCursor = 0;

  const ambassadorColleges: SeedCollege[] = shuffle([...COLLEGES]).slice(0, AMBASSADOR_COUNT);
  const ambassadors: Ambassador[] = ambassadorColleges.map((college, index) => {
    const name = allNames[nameCursor++];
    const id = `usr_amb_${String(index + 1).padStart(2, "0")}`;
    return {
      id,
      name,
      email: uniqueEmail(
        `${slug(name.split(" ")[0])}.${slug(name.split(" ")[1])}.amb${index + 1}@example.com`,
      ),
      phone: nextPhone(),
      collegeId: college.id,
      refCode: makeRefCode(name),
      tokenHash: sha256Hex(`seed-token:${id}`),
      seatNo: existing.maxSeat + STUDENT_COUNT + index + 1,
      userAgent: pick(USER_AGENTS),
      createdAtMs: CAMPAIGN_START_MS + rint(2 * 3_600_000, 6 * 3_600_000),
    };
  });

  /* Students, day by day, following the pacing with noise and the channel mix. */
  const collegeWeights = COLLEGES.map((college) => ({ value: college.id, weight: rint(1, 5) }));
  const clubColleges = shuffle([...COLLEGES]).slice(0, 6);
  const students: Student[] = [];
  const referralCounts = new Map<string, number>();

  for (let dayIndex = 0; dayIndex < perDayChannels.length; dayIndex++) {
    const day = dayIndex + 1;
    const ambassadorOrder = shuffle([...ambassadors]);
    let ambassadorCursor = 0;

    for (const channel of perDayChannels[dayIndex]) {
      const seatNo = existing.maxSeat + students.length + 1;
      let referredBy: string | null = null;
      let referrerRefCode: string | null = null;
      let collegeId: string;
      let shareVariant: ShareVariant | null = null;
      let utmSource: string;
      let utmMedium: string;
      let utmContent: string | null = null;

      if (channel === "ambassadors") {
        const ambassador = ambassadorOrder[ambassadorCursor % ambassadorOrder.length];
        ambassadorCursor++;
        referredBy = ambassador.id;
        referrerRefCode = ambassador.refCode;
        collegeId = ambassador.collegeId;
        utmSource = "ambassadors";
        utmMedium = "whatsapp";
        utmContent = ambassador.refCode;
      } else if (channel === "referral") {
        const candidates = students.filter(
          (s) => (referralCounts.get(s.id) ?? 0) < MAX_REFERRALS_PER_REFERRER,
        );
        const referrer = candidates.length > 0 ? pick(candidates) : null;
        if (referrer) {
          referredBy = referrer.id;
          referrerRefCode = referrer.refCode;
          collegeId = referrer.collegeId;
          referralCounts.set(referrer.id, (referralCounts.get(referrer.id) ?? 0) + 1);
        } else {
          const ambassador = pick(ambassadors);
          referredBy = ambassador.id;
          referrerRefCode = ambassador.refCode;
          collegeId = ambassador.collegeId;
        }
        shareVariant = pick(WHATSAPP_VARIANTS);
        utmSource = "referral";
        utmMedium = "whatsapp";
        utmContent = shareVariant;
      } else if (channel === "clubs") {
        collegeId = pick(clubColleges).id;
        utmSource = "clubs";
        utmMedium = "whatsapp";
      } else if (channel === "boost") {
        collegeId = weightedPick(collegeWeights);
        utmSource = "boost";
        utmMedium = "paid";
      } else {
        collegeId = weightedPick(collegeWeights);
        utmSource = "owned";
        utmMedium = "organic";
      }

      const name = allNames[nameCursor++ % allNames.length];
      const [firstName, lastName] = name.split(" ");
      const id = `usr_${String(seatNo).padStart(4, "0")}`;
      const timeBase =
        day === 7 ? rint(2 * 3_600_000, 8 * 3_600_000) : rint(4 * 3_600_000, 17 * 3_600_000);
      const branch = weightedPick(BRANCH_WEIGHTS);
      const interest = pick(INTERESTS);
      students.push({
        id,
        seatNo,
        name,
        email: uniqueEmail(`${slug(firstName)}.${slug(lastName)}${seatNo}@example.com`),
        phone: nextPhone(),
        collegeId,
        branch,
        gradYear: weightedPick(GRAD_YEAR_WEIGHTS),
        refCode: makeRefCode(name),
        referredBy,
        referrerRefCode,
        tokenHash: sha256Hex(`seed-token:${id}`),
        ideaKey: `${branch}|${interest}`,
        channel,
        utmSource,
        utmMedium,
        utmContent,
        shareVariant,
        ipHash: `ip_${sha256Hex(`seed-ip:${Math.floor(seatNo / 4)}`).slice(0, 12)}`,
        userAgent: pick(USER_AGENTS),
        flagReason: null,
        flagStatus: null,
        createdAtMs: CAMPAIGN_START_MS + dayIndex * DAY_MS + timeBase,
        day,
        checkedIn: false,
        checkedInAtMs: null,
        submission: null,
      });
    }
  }

  /* Flags: 12 users, deterministic reasons. Rejected users are not checked in. */
  const flagged = shuffle(students.filter((s) => s.day >= 2 && s.day <= 6)).slice(0, FLAG_COUNT);
  const velocityHash = `ip_${sha256Hex("seed-ip:velocity").slice(0, 12)}`;
  const deviceHash = `ip_${sha256Hex("seed-ip:device").slice(0, 12)}`;
  const flagPlan: { reason: string; status: FlagStatus }[] = [
    {
      reason: "ip_velocity: more than 5 registrations from one IP hash in an hour",
      status: "open",
    },
    {
      reason: "ip_velocity: more than 5 registrations from one IP hash in an hour",
      status: "open",
    },
    {
      reason: "ip_velocity: more than 5 registrations from one IP hash in an hour",
      status: "open",
    },
    {
      reason: "ip_velocity: more than 5 registrations from one IP hash in an hour",
      status: "open",
    },
    {
      reason: "ip_velocity: more than 5 registrations from one IP hash in an hour",
      status: "approved",
    },
    {
      reason: "ip_velocity: more than 5 registrations from one IP hash in an hour",
      status: "rejected",
    },
    { reason: "duplicate_device: same device fingerprint as another registration", status: "open" },
    { reason: "duplicate_device: same device fingerprint as another registration", status: "open" },
    {
      reason: "duplicate_device: same device fingerprint as another registration",
      status: "approved",
    },
    { reason: "referral_burst: referred 6+ users within 2 hours", status: "open" },
    { reason: "referral_burst: referred 6+ users within 2 hours", status: "approved" },
    { reason: "referral_burst: referred 6+ users within 2 hours", status: "rejected" },
  ];
  flagged.forEach((student, index) => {
    const plan = flagPlan[index];
    student.flagReason = plan.reason;
    student.flagStatus = plan.status;
    if (plan.reason.startsWith("ip_velocity")) student.ipHash = velocityHash;
    if (plan.reason.startsWith("duplicate_device")) student.ipHash = deviceHash;
  });

  /* Check-ins: ~45% of students, on Day 7 between 18:30 and 19:15 IST. */
  const checkins: Checkin[] = [];
  for (const student of students) {
    if (student.flagStatus) continue;
    if (rand() < CHECKIN_RATE) {
      student.checkedIn = true;
      student.checkedInAtMs = WORKSHOP_DAY_MS + 13 * 3_600_000 + rint(0, 45 * 60_000);
      checkins.push({ userId: student.id, checkedInAtMs: student.checkedInAtMs });
    }
  }

  /* Submissions: 120 from checked-in students, each with a full evaluation. */
  const submitters = shuffle(students.filter((s) => s.checkedIn)).slice(0, SUBMISSION_TARGET);
  const submissions: Submission[] = submitters.map((student, index) => {
    const id = `sub_${String(index + 1).padStart(3, "0")}`;
    const score = rint(58, 98);
    const bank = IDEA_BANK[student.ideaKey];
    const createdAtMs = Math.max(
      (student.checkedInAtMs ?? WORKSHOP_DAY_MS) + rint(10 * 60_000, 25 * 60_000),
      WORKSHOP_DAY_MS + 13 * 3_600_000 + rint(30 * 60_000, 150 * 60_000),
    );
    const submission: Submission = {
      id,
      userId: student.id,
      liveUrl: `https://example.com/ship60-projects/${sha256Hex(id).slice(0, 8)}`,
      repoUrl: `https://github.com/ship60-simulated/${slug(student.name)}-${sha256Hex(id).slice(0, 6)}`,
      description: bank
        ? `${bank.title}: ${bank.pitch}`.slice(0, 590)
        : `A beginner AI project built during the 60-minute workshop (${student.branch}).`,
      score,
      evaluation: buildEvaluation(score),
      certId: `cert_${sha256Hex(`cert:${id}`).slice(0, 20)}`,
      createdAtMs,
    };
    student.submission = submission;
    return submission;
  });

  /* Referrals: one row per attributed registration (ambassador links + loop). */
  const referralStatuses: Referral[] = students
    .filter((student) => student.referredBy !== null)
    .map((student) => {
      const rejected = student.flagStatus === "rejected";
      const qualified = student.checkedIn && !rejected;
      return {
        id: `ref_${student.id}`,
        referrerId: student.referredBy as string,
        refereeId: student.id,
        status: rejected ? "rejected" : qualified ? "qualified" : "pending",
        createdAtMs: student.createdAtMs,
        qualifiedAtMs: qualified ? student.checkedInAtMs : null,
      };
    });

  const events = generateEvents(students, ambassadors, submissions, dailyTotals);

  return {
    ambassadors,
    students,
    referrals: referralStatuses,
    checkins,
    submissions,
    events,
    dailyTotals,
  };
}

const STRENGTHS = [
  "The deployed link works on the first try and loads fast on mobile.",
  "The AI call is central to the product, not decoration.",
  "The problem is stated in one clear sentence.",
  "The README explains how to run it in under a minute.",
  "The UI keeps the main action above the fold on a phone.",
  "Error states are handled instead of crashing.",
  "The prompt template is separated from the UI code.",
  "Input is validated before the model call.",
  "The demo uses a real user problem from the student's own campus.",
  "Shipping was scoped to one feature done well.",
];

const IMPROVEMENTS = [
  "Add a loading state while the model responds.",
  "Handle empty input with a helpful message.",
  "Show an example prompt so a first-time visitor knows what to type.",
  "Cache the last response so repeat taps are instant.",
  "Add a short README section about the AI prompt used.",
  "Move secrets and API keys to environment variables.",
  "Add a copy button for the generated result.",
  "Support keyboard submission on desktop.",
  "Add one test for the core transformation.",
  "Compress the hero screenshot for slow connections.",
];

const NEXT_FEATURES = [
  "Add a share button that posts the result to WhatsApp.",
  "Let users save results and revisit them later.",
  "Add Telugu input support for the prompt.",
  "Show a history of past generations.",
  "Add a simple feedback thumbs-up/down.",
  "Let users pick between two output styles.",
];

function buildEvaluation(score: number): Evaluation {
  const caps = [30, 25, 20, 15, 10] as const;
  const parts = caps.map((cap) => Math.floor((score * cap) / 100));
  let remainder = score - parts.reduce((sum, v) => sum + v, 0);
  while (remainder > 0) {
    const options = parts
      .map((value, index) => ({ index, room: caps[index] - value }))
      .filter((option) => option.room > 0);
    const chosen = weightedPick(
      options.map((option) => ({ value: option.index, weight: option.room })),
    );
    parts[chosen]++;
    remainder--;
  }
  const strengths = shuffle([...STRENGTHS]).slice(0, 3);
  const improvements = shuffle([...IMPROVEMENTS]).slice(0, 3);
  return {
    score,
    breakdown: {
      worksLive: parts[0],
      meaningfulAi: parts[1],
      problemClarity: parts[2],
      readmeHygiene: parts[3],
      originality: parts[4],
    },
    strengths,
    improvements,
    nextFeature: pick(NEXT_FEATURES),
  };
}

function generateEvents(
  students: Student[],
  ambassadors: Ambassador[],
  submissions: Submission[],
  dailyTotals: number[],
): SimEvent[] {
  const events: SimEvent[] = [];
  let seq = 0;
  const dayWeights = dailyTotals.map((value, index) => ({ value: index, weight: value }));

  function add(
    type: string,
    createdAtMs: number,
    extra: Partial<
      Pick<
        SimEvent,
        "anonId" | "userId" | "refCode" | "props" | "utmSource" | "utmMedium" | "utmCampaign"
      >
    > = {},
  ): void {
    seq++;
    events.push({
      id: `ev_${String(seq).padStart(5, "0")}`,
      type,
      anonId: extra.anonId ?? null,
      userId: extra.userId ?? null,
      refCode: extra.refCode ?? null,
      props: extra.props ?? null,
      utmSource: extra.utmSource ?? null,
      utmMedium: extra.utmMedium ?? null,
      utmCampaign: extra.utmCampaign ?? null,
      createdAtMs,
    });
  }

  function anonymousTime(): number {
    const day = weightedPick(dayWeights);
    return CAMPAIGN_START_MS + day * DAY_MS + rint(4 * 3_600_000, 17 * 3_600_000);
  }

  /* Top of funnel. */
  for (let i = 0; i < 2600; i++) add("page_view", anonymousTime(), { anonId: `anon_${i}` });
  for (let i = 0; i < 1404; i++)
    add("idea_generated", anonymousTime(), { anonId: `anon_${Math.floor(i / 2)}` });
  for (let i = 0; i < 700; i++)
    add("form_started", anonymousTime(), { anonId: `anon_${Math.floor(i / 3)}` });

  /* Registration + sharing. */
  for (const student of students) {
    add("registered", student.createdAtMs, {
      anonId: `anon_user_${student.seatNo}`,
      userId: student.id,
      refCode: student.refCode,
      props: JSON.stringify({ channel: student.channel, seatNo: student.seatNo }),
      utmSource: student.utmSource,
      utmMedium: student.utmMedium,
      utmCampaign: "ship60",
    });
  }
  const sharers = shuffle(students.filter((s) => s.day <= 6)).slice(0, 260);
  for (const student of sharers) {
    const variant = pick(WHATSAPP_VARIANTS);
    add("share_clicked", student.createdAtMs + rint(60 * 60_000, 36 * 60 * 60_000), {
      userId: student.id,
      props: JSON.stringify({ variant }),
    });
  }

  /* Referral landings precede the referee's registration. */
  let landingIndex = 0;
  for (const student of students) {
    if (!student.referredBy || !student.referrerRefCode) continue;
    const landings = rint(2, 5);
    for (let i = 0; i < landings; i++) {
      const at = Math.max(
        CAMPAIGN_START_MS + rint(4 * 3_600_000, 17 * 3_600_000),
        student.createdAtMs - rint(1 * 3_600_000, 48 * 3_600_000),
      );
      add("referral_landing", at, {
        anonId: `anon_ref_${landingIndex++}`,
        refCode: student.referrerRefCode,
        props: JSON.stringify({ variant: student.shareVariant ?? "en" }),
      });
    }
    add("referral_registered", student.createdAtMs, {
      userId: student.id,
      refCode: student.referrerRefCode,
      props: JSON.stringify({ channel: student.channel }),
    });
  }

  /* Check-ins and submissions. */
  for (const student of students) {
    if (student.checkedIn && student.checkedInAtMs) {
      add("checkin", student.checkedInAtMs, { userId: student.id });
    }
  }
  for (const submission of submissions) {
    add("submitted", submission.createdAtMs, {
      userId: submission.userId,
      props: JSON.stringify({ submissionId: submission.id, score: submission.score }),
    });
  }

  /* AI usage: bounded idea cache, evaluator runs, one daily brief. */
  for (const branch of BRANCHES) {
    for (const interest of INTERESTS) {
      for (let variant = 0; variant < 3; variant++) {
        add("ai_call", anonymousTime(), {
          userId: null,
          props: JSON.stringify({
            kind: "idea",
            key: `idea:${branch}:${interest}:${variant}`,
            source: rand() < 0.65 ? "ai" : "bank",
            attempts: rand() < 0.9 ? 1 : 2,
            ms: rint(500, 3400),
          }),
        });
      }
    }
  }
  for (const submission of submissions) {
    add("ai_call", submission.createdAtMs + rint(3_000, 25_000), {
      userId: submission.userId,
      props: JSON.stringify({ kind: "evaluator", score: submission.score }),
    });
  }
  for (let day = 0; day < PACING.length; day++) {
    add("ai_call", CAMPAIGN_START_MS + day * DAY_MS + 15 * 3_600_000 + 30 * 60_000, {
      props: JSON.stringify({ kind: "brief", day: day + 1 }),
    });
  }

  /* Ambassadors share on Day 1; keeps their last-activity visible in admin. */
  for (const ambassador of ambassadors) {
    add("share_clicked", ambassador.createdAtMs + rint(30 * 60_000, 3 * 3_600_000), {
      userId: ambassador.id,
      props: JSON.stringify({ variant: "en", role: "ambassador" }),
    });
  }

  return events;
}

/* ----------------------------------- SQL ----------------------------------- */

function q(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function num(value: number | null): string {
  return value === null ? "NULL" : String(value);
}

function insertBatches(
  statements: string[],
  table: string,
  columns: string,
  rows: string[][],
  batchSize = 60,
): void {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows
      .slice(i, i + batchSize)
      .map((row) => `(${row.join(", ")})`)
      .join(",\n");
    statements.push(`INSERT INTO ${table} (${columns}) VALUES\n${batch};`);
  }
}

function buildStatements(data: ReturnType<typeof generate>): string[] {
  const statements: string[] = [];
  statements.push(
    "-- Ship60 simulated seed (scripts/seed.ts). Every row here has is_simulated = 1.",
    "-- Children first so re-runs are idempotent.",
    "DELETE FROM submissions WHERE is_simulated = 1;",
    "DELETE FROM checkins WHERE is_simulated = 1;",
    "DELETE FROM referrals WHERE is_simulated = 1;",
    "DELETE FROM events WHERE is_simulated = 1;",
    "DELETE FROM users WHERE is_simulated = 1;",
  );

  const collegeRows = COLLEGES.map((c) => [
    q(c.id),
    q(c.name),
    q(c.shortName),
    q(c.city),
    q(c.state),
  ]);
  for (let i = 0; i < collegeRows.length; i += 40) {
    statements.push(
      `INSERT OR IGNORE INTO colleges (id, name, short_name, city, state) VALUES\n${collegeRows
        .slice(i, i + 40)
        .map((row) => `(${row.join(", ")})`)
        .join(",\n")};`,
    );
  }

  const userRows: string[][] = [];
  for (const a of data.ambassadors) {
    userRows.push([
      q(a.id),
      q(a.name),
      q(a.email),
      q(a.phone),
      q(a.collegeId),
      "NULL",
      q("CSE/IT/AI-ML"),
      num(2027),
      q("ambassador"),
      q(a.refCode),
      "NULL",
      q(a.tokenHash),
      num(a.seatNo),
      "NULL",
      "NULL",
      "NULL",
      "NULL",
      "NULL",
      "NULL",
      "NULL",
      q(a.userAgent),
      q(iso(a.createdAtMs)),
      "NULL",
      "NULL",
      num(1),
      q(iso(a.createdAtMs)),
    ]);
  }
  for (const s of data.students) {
    userRows.push([
      q(s.id),
      q(s.name),
      q(s.email),
      q(s.phone),
      q(s.collegeId),
      "NULL",
      q(s.branch),
      num(s.gradYear),
      q("student"),
      q(s.refCode),
      s.referredBy ? q(s.referredBy) : "NULL",
      q(s.tokenHash),
      num(s.seatNo),
      q(s.ideaKey),
      q(s.utmSource),
      q(s.utmMedium),
      q("ship60"),
      s.utmContent ? q(s.utmContent) : "NULL",
      s.shareVariant ? q(s.shareVariant) : "NULL",
      q(s.ipHash),
      q(s.userAgent),
      q(iso(s.createdAtMs)),
      s.flagReason ? q(s.flagReason) : "NULL",
      s.flagStatus ? q(s.flagStatus) : "NULL",
      num(1),
      q(iso(s.createdAtMs)),
    ]);
  }
  insertBatches(
    statements,
    "users",
    [
      "id",
      "name",
      "email",
      "phone",
      "college_id",
      "college_other",
      "branch",
      "grad_year",
      "role",
      "ref_code",
      "referred_by",
      "token_hash",
      "seat_no",
      "idea_key",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "share_variant",
      "ip_hash",
      "user_agent",
      "consent_at",
      "flag_reason",
      "flag_status",
      "is_simulated",
      "created_at",
    ].join(", "),
    userRows,
  );

  const referralRows = data.referrals.map((r) => [
    q(r.id),
    q(r.referrerId),
    q(r.refereeId),
    q(r.status),
    q(iso(r.createdAtMs)),
    r.qualifiedAtMs === null ? "NULL" : q(iso(r.qualifiedAtMs)),
    num(1),
  ]);
  insertBatches(
    statements,
    "referrals",
    "id, referrer_id, referee_id, status, created_at, qualified_at, is_simulated",
    referralRows,
  );

  const checkinRows = data.checkins.map((c) => [
    q(c.userId),
    q("ship60-2026-10-11"),
    q(iso(c.checkedInAtMs)),
    num(1),
  ]);
  insertBatches(
    statements,
    "checkins",
    "user_id, workshop_id, checked_in_at, is_simulated",
    checkinRows,
  );

  const submissionRows = data.submissions.map((s) => [
    q(s.id),
    q(s.userId),
    q(s.liveUrl),
    q(s.repoUrl),
    q(s.description),
    q("evaluated"),
    num(s.score),
    q(JSON.stringify(s.evaluation)),
    q(s.certId),
    num(1),
    q(iso(s.createdAtMs)),
  ]);
  insertBatches(
    statements,
    "submissions",
    "id, user_id, live_url, repo_url, description, status, score, evaluation, cert_id, is_simulated, created_at",
    submissionRows,
  );

  const eventRows = data.events.map((e) => [
    q(e.id),
    q(e.type),
    e.anonId ? q(e.anonId) : "NULL",
    e.userId ? q(e.userId) : "NULL",
    e.refCode ? q(e.refCode) : "NULL",
    e.props ? q(e.props) : "NULL",
    e.utmSource ? q(e.utmSource) : "NULL",
    e.utmMedium ? q(e.utmMedium) : "NULL",
    e.utmCampaign ? q(e.utmCampaign) : "NULL",
    num(1),
    q(iso(e.createdAtMs)),
  ]);
  insertBatches(
    statements,
    "events",
    "id, type, anon_id, user_id, ref_code, props, utm_source, utm_medium, utm_campaign, is_simulated, created_at",
    eventRows,
  );

  return statements;
}

/* -------------------------------- execution -------------------------------- */

function chunkStatements(statements: string[]): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const statement of statements) {
    const candidate = current.length === 0 ? statement : `${current}\n${statement}`;
    if (candidate.length > MAX_STATEMENT_CHUNK_BYTES && current.length > 0) {
      chunks.push(current);
      current = statement;
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function runWrangler(args: string[], cwd: string, capture = false): string {
  const result = execFileSync("npx", ["wrangler", ...args], {
    cwd,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  return capture ? result : "";
}

function applyChunks(chunks: string[], remote: boolean, cwd: string): void {
  const dir = mkdtempSync(path.join(tmpdir(), "ship60-seed-"));
  try {
    chunks.forEach((chunk, index) => {
      const file = path.join(dir, `seed-${String(index + 1).padStart(3, "0")}.sql`);
      writeFileSync(file, chunk, "utf8");
      const mode = remote ? "--remote" : "--local";
      console.log(
        `  [${index + 1}/${chunks.length}] ${path.basename(file)} (${(chunk.length / 1024).toFixed(0)} KB)`,
      );
      runWrangler(
        ["d1", "execute", DB_NAME, mode, ...(remote ? ["--yes"] : []), "--file", file],
        cwd,
      );
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

interface DbCounts {
  colleges: number;
  students: number;
  ambassadors: number;
  referralRows: number;
  referralQualified: number;
  checkins: number;
  submissions: number;
  events: number;
  flagged: number;
  referralChannel: number;
}

function readDbCounts(remote: boolean, cwd: string): DbCounts | null {
  const sql = `SELECT
    (SELECT COUNT(*) FROM colleges) AS colleges,
    (SELECT COUNT(*) FROM users WHERE is_simulated = 1 AND role = 'student') AS students,
    (SELECT COUNT(*) FROM users WHERE is_simulated = 1 AND role = 'ambassador') AS ambassadors,
    (SELECT COUNT(*) FROM referrals WHERE is_simulated = 1) AS referralRows,
    (SELECT COUNT(*) FROM referrals WHERE is_simulated = 1 AND status = 'qualified') AS referralQualified,
    (SELECT COUNT(*) FROM checkins WHERE is_simulated = 1) AS checkins,
    (SELECT COUNT(*) FROM submissions WHERE is_simulated = 1) AS submissions,
    (SELECT COUNT(*) FROM events WHERE is_simulated = 1) AS events,
    (SELECT COUNT(*) FROM users WHERE is_simulated = 1 AND flag_status IS NOT NULL) AS flagged,
    (SELECT COUNT(*) FROM users WHERE is_simulated = 1 AND utm_source = 'referral') AS referralChannel;`;
  try {
    const output = runWrangler(
      ["d1", "execute", DB_NAME, remote ? "--remote" : "--local", "--json", "--command", sql],
      cwd,
      true,
    );
    const parsed = JSON.parse(output) as { results?: DbCounts[] }[];
    return parsed[0]?.results?.[0] ?? null;
  } catch (error) {
    console.warn(
      "Warning: could not read back counts from D1:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

function loadExistingReservations(remote: boolean, cwd: string): ExistingReservations {
  try {
    const output = runWrangler(
      [
        "d1",
        "execute",
        DB_NAME,
        remote ? "--remote" : "--local",
        "--json",
        "--command",
        "SELECT seat_no, email, phone, ref_code FROM users WHERE is_simulated = 0;",
      ],
      cwd,
      true,
    );
    const parsed = JSON.parse(output) as {
      results?: { seat_no: number; email: string; phone: string; ref_code: string }[];
    }[];
    const rows = parsed[0]?.results ?? [];
    const reservations: ExistingReservations = {
      maxSeat: 0,
      emails: new Set<string>(),
      phones: new Set<string>(),
      refCodes: new Set<string>(),
    };
    for (const row of rows) {
      reservations.maxSeat = Math.max(reservations.maxSeat, row.seat_no);
      reservations.emails.add(row.email);
      reservations.phones.add(row.phone);
      reservations.refCodes.add(row.ref_code);
    }
    return reservations;
  } catch (error) {
    console.warn(
      "Warning: could not read existing users; assuming an empty database:",
      error instanceof Error ? error.message : error,
    );
    return { maxSeat: 0, emails: new Set(), phones: new Set(), refCodes: new Set() };
  }
}

/* ----------------------------------- cli ----------------------------------- */

function printTable(headers: string[], rows: (string | number)[][]): void {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index]).length)),
  );
  const line = widths.map((width) => "-".repeat(width + 2)).join("+");
  const format = (row: (string | number)[]) =>
    row.map((cell, index) => ` ${String(cell).padEnd(widths[index])} `).join("|");
  console.log(line);
  console.log(format(headers));
  console.log(line);
  for (const row of rows) console.log(format(row));
  console.log(line);
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const cwd = process.cwd();
  const remote = args.has("--remote");
  const clear = args.has("--clear");
  const confirmed = args.has("--confirm");

  if (!existsSync(path.join(cwd, "wrangler.jsonc"))) {
    console.error("Run this script from the repository root (wrangler.jsonc not found).");
    process.exit(1);
  }
  if (remote && !confirmed) {
    console.error(
      "Refusing to write to remote D1. Re-run with --confirm (npm run seed:remote -- --confirm).",
    );
    process.exit(2);
  }

  const mode = remote ? "remote" : "local";

  if (clear) {
    console.log(`Ship60 seed — clearing simulated rows (${mode})`);
    const statements = [
      "DELETE FROM submissions WHERE is_simulated = 1;",
      "DELETE FROM checkins WHERE is_simulated = 1;",
      "DELETE FROM referrals WHERE is_simulated = 1;",
      "DELETE FROM events WHERE is_simulated = 1;",
      "DELETE FROM users WHERE is_simulated = 1;",
    ];
    applyChunks([statements.join("\n")], remote, cwd);
    const counts = readDbCounts(remote, cwd);
    if (counts) {
      printTable(
        ["table", "simulated rows left"],
        [
          ["users", counts.students + counts.ambassadors],
          ["referrals", counts.referralRows],
          ["checkins", counts.checkins],
          ["submissions", counts.submissions],
          ["events", counts.events],
        ],
      );
    }
    console.log("Done. Real rows were untouched.");
    return;
  }

  console.log(`Ship60 seed — deterministic simulation (${mode}, PRNG seed ${PRNG_SEED})`);
  const existing = loadExistingReservations(remote, cwd);
  const data = generate(existing);
  const statements = buildStatements(data);
  const sql = statements.join("\n");
  const fingerprint = sha256Hex(sql).slice(0, 16);

  const referredStudents = data.students.filter((s) => s.channel === "referral").length;
  const nonReferred = STUDENT_COUNT - referredStudents;
  const kFactor = referredStudents / nonReferred;
  const checkedIn = data.students.filter((s) => s.checkedIn).length;
  const checkinRate = checkedIn / STUDENT_COUNT;
  const totalStudents = data.students.length;
  const totalErrors: string[] = [];

  function check(label: string, condition: boolean, detail: string): void {
    console.log(`${condition ? "PASS" : "FAIL"}  ${label} — ${detail}`);
    if (!condition) totalErrors.push(label);
  }

  check(
    "registration total within 5% of PLANNED_REGISTRATIONS",
    Math.abs(totalStudents - PLANNED_REGISTRATIONS) / PLANNED_REGISTRATIONS <= 0.05,
    `${totalStudents} vs ${PLANNED_REGISTRATIONS}`,
  );
  for (const channel of CHANNEL_TARGETS) {
    const actual = data.students.filter((s) => s.channel === channel.id).length;
    check(
      `channel "${channel.id}" within 5% of plan`,
      Math.abs(actual - channel.target) <= channel.target * 0.05,
      `${actual} vs ${channel.target}`,
    );
  }
  check(
    "referral k-factor close to plan",
    Math.abs(kFactor - REFERRAL_K_FACTOR) <= 0.02,
    `k=${kFactor.toFixed(3)} vs ${REFERRAL_K_FACTOR}`,
  );
  check(
    "check-in rate ~45%",
    checkinRate >= 0.4 && checkinRate <= 0.5,
    `${(checkinRate * 100).toFixed(1)}% (${checkedIn}/${STUDENT_COUNT})`,
  );
  check(
    "submissions ~120",
    Math.abs(data.submissions.length - SUBMISSION_TARGET) <= 6,
    `${data.submissions.length}`,
  );
  const badContact = [...data.ambassadors, ...data.students].filter(
    (u) => !u.email.endsWith("@example.com") || !/^\+91 9000[05]\d{5}$/.test(u.phone),
  );
  check(
    "every generated row is simulated and contact-safe",
    badContact.length === 0,
    badContact.length === 0
      ? `${totalStudents + data.ambassadors.length} users, ${data.referrals.length} referrals, ${data.checkins.length} check-ins, ${data.submissions.length} submissions, ${data.events.length} events`
      : `offenders: ${badContact
          .slice(0, 3)
          .map((u) => `${u.id} ${u.phone}`)
          .join(", ")}`,
  );
  if (totalErrors.length > 0) {
    console.error(`\n${totalErrors.length} assertion(s) failed; not writing to D1.`);
    process.exit(1);
  }

  console.log(
    `\nGenerated ${(sql.length / (1024 * 1024)).toFixed(2)} MB of SQL in ${statements.length} statements.`,
  );
  const chunks = chunkStatements(statements);
  console.log(`Applying ${chunks.length} chunks to ${mode} D1…`);
  applyChunks(chunks, remote, cwd);

  const db = readDbCounts(remote, cwd);

  const pacingRows = PACING.map((planned, index) => {
    const actual = data.students.filter((s) => s.day <= index + 1).length;
    return [index + 1, planned, actual, `${(100 * actual) / planned}%`];
  });

  console.log("\nGenerated rows");
  if (existing.maxSeat > 0) {
    console.log(
      `(existing real users hold seats 1..${existing.maxSeat}; simulated seats start at ${existing.maxSeat + 1})`,
    );
  }
  printTable(
    ["table", "rows"],
    [
      ["colleges (real names)", COLLEGES.length],
      ["ambassadors", data.ambassadors.length],
      ["students", data.students.length],
      ["referrals", data.referrals.length],
      ["check-ins", data.checkins.length],
      ["submissions (evaluated)", data.submissions.length],
      ["events", data.events.length],
      ["flagged users", data.students.filter((s) => s.flagStatus !== null).length],
    ],
  );

  console.log("\nChannel mix (PRD §3.2)");
  printTable(
    ["channel", "plan", "seeded", "delta"],
    CHANNEL_TARGETS.map((channel) => {
      const actual = data.students.filter((s) => s.channel === channel.id).length;
      const delta = `${(((actual - channel.target) / channel.target) * 100).toFixed(1)}%`;
      return [channel.id, channel.target, actual, delta];
    }),
  );

  console.log("\nPacing (cumulative by day)");
  printTable(["day", "planned", "simulated", "of plan"], pacingRows);

  if (db) {
    console.log("\nD1 read-back");
    printTable(
      ["table", "generated", "in D1"],
      [
        ["colleges", COLLEGES.length, db.colleges],
        ["students", data.students.length, db.students],
        ["ambassadors", data.ambassadors.length, db.ambassadors],
        ["referrals", data.referrals.length, db.referralRows],
        [
          "referrals qualified",
          data.referrals.filter((r) => r.status === "qualified").length,
          db.referralQualified,
        ],
        ["check-ins", data.checkins.length, db.checkins],
        ["submissions", data.submissions.length, db.submissions],
        ["events", data.events.length, db.events],
        ["flagged users", data.students.filter((s) => s.flagStatus !== null).length, db.flagged],
        ["referral channel users", referredStudents, db.referralChannel],
      ],
    );
  }

  console.log(`\nFingerprint: ${fingerprint}`);
  console.log("Every seeded row has is_simulated = 1. No real students are contacted.");
  console.log("Done.");
}

main();
