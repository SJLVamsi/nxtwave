/**
 * Every request/response shape in PRD §6.5 as zod schemas (source of truth).
 * Orchestrator-owned after Phase 0. Workstreams consume, never edit.
 */
import { z } from "zod";
import {
  BRANCHES,
  CLIENT_EVENT_TYPES,
  EVENT_TYPES,
  GRAD_YEARS,
  INTERESTS,
  MAX_EVENT_PROPS_BYTES,
  WHATSAPP_VARIANTS,
} from "./constants";

/* ---------------------------------- base ---------------------------------- */

export const BranchSchema = z.enum(BRANCHES);
export const InterestSchema = z.enum(INTERESTS);
export const VariantSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export const WhatsAppVariantSchema = z.enum(WHATSAPP_VARIANTS);
export const EventTypeSchema = z.enum(EVENT_TYPES);

export const ErrorEnvelopeSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

export const OkSchema = z.object({ ok: z.literal(true) });

/* ---------------------------------- ideas --------------------------------- */

export const IdeaCardSchema = z.object({
  key: z.string(),
  branch: BranchSchema,
  interest: InterestSchema,
  variant: VariantSchema,
  title: z.string().min(3).max(80),
  pitch: z.string().min(10).max(220),
  steps: z.array(z.string().min(3).max(160)).length(3),
  tools: z.array(z.string().min(1).max(40)).min(2).max(5),
  deployLine: z.string().min(3).max(160),
  source: z.enum(["ai", "bank"]),
});
export type IdeaCard = z.infer<typeof IdeaCardSchema>;

export const IdeaPreviewRequestSchema = z.object({
  branch: BranchSchema,
  interest: InterestSchema,
  variant: VariantSchema.optional(),
});
export type IdeaPreviewRequest = z.infer<typeof IdeaPreviewRequestSchema>;

export const IdeaPreviewResponseSchema = z.object({ idea: IdeaCardSchema });
export type IdeaPreviewResponse = z.infer<typeof IdeaPreviewResponseSchema>;

/* ------------------------------- registration ------------------------------ */

export const UTM_SCHEMA = {
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  utmContent: z.string().max(120).optional(),
};

const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-()]/g, ""))
  .refine((v) => /^(?:\+91|91|0)?[6-9]\d{9}$/.test(v), "Enter a valid +91 mobile number")
  .transform((v) => {
    const digits = v.replace(/^(?:\+91|91|0)/, "");
    return `+91${digits}`;
  });

export const RegisterRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(160).transform((v) => v.trim().toLowerCase()),
  phone: phoneSchema,
  collegeId: z.string().max(60).optional(),
  collegeOther: z.string().trim().max(120).optional(),
  branch: BranchSchema,
  gradYear: z
    .number()
    .int()
    .refine((y) => (GRAD_YEARS as readonly number[]).includes(y), "Unsupported graduation year")
    .default(2027),
  ideaKey: z.string().max(120).optional(),
  turnstileToken: z.string().max(4000).optional(),
  refCode: z.string().max(20).optional(),
  shareVariant: WhatsAppVariantSchema.optional(),
  consent: z.literal(true),
  ...UTM_SCHEMA,
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const RegisterResponseSchema = z.object({
  seatNo: z.number().int().positive(),
  refCode: z.string(),
  launchpadUrl: z.string(),
  token: z.string(),
  name: z.string(),
  isReturning: z.boolean(),
});
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

/* ----------------------------------- me ----------------------------------- */

export const MeResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    firstName: z.string(),
    college: z.object({ id: z.string(), name: z.string(), shortName: z.string() }).nullable(),
    collegeOther: z.string().nullable(),
    branch: z.string(),
    gradYear: z.number(),
    seatNo: z.number(),
    refCode: z.string(),
    createdAt: z.string(),
    isSimulated: z.boolean(),
  }),
  idea: IdeaCardSchema.nullable(),
  referralLink: z.string(),
  referralLandingPath: z.string(),
  stats: z.object({
    totalReferrals: z.number(),
    qualifiedReferrals: z.number(),
    pendingReferrals: z.number(),
    tierIndex: z.number(),
    nextTierAt: z.number().nullable(),
    nextTierLabel: z.string().nullable(),
  }),
  ranks: z.object({
    student: z.number().nullable(),
    college: z.object({ rank: z.number(), name: z.string() }).nullable(),
  }),
  referrals: z.array(
    z.object({
      firstName: z.string(),
      status: z.enum(["pending", "qualified", "rejected"]),
      createdAt: z.string(),
    }),
  ),
  workshop: z.object({ id: z.string(), startIso: z.string() }),
  calendar: z.object({ icsPath: z.string(), googleUrl: z.string() }),
  checkedIn: z.boolean(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

/* ---------------------------------- stats --------------------------------- */

export const StatsPublicResponseSchema = z.object({
  registrations: z.number(),
  colleges: z.number(),
  workshopStartIso: z.string(),
  target: z.number(),
});
export type StatsPublicResponse = z.infer<typeof StatsPublicResponseSchema>;

/* ------------------------------- leaderboard ------------------------------- */

export const StudentLeaderboardRowSchema = z.object({
  rank: z.number(),
  displayName: z.string(),
  collegeShort: z.string(),
  qualified: z.number(),
  total: z.number(),
  isSimulated: z.boolean().optional(),
});
export const CollegeLeaderboardRowSchema = z.object({
  rank: z.number(),
  collegeId: z.string(),
  name: z.string(),
  shortName: z.string(),
  registrations: z.number(),
  qualified: z.number(),
  ambassadors: z.number(),
  isSimulated: z.boolean().optional(),
});
export const LeaderboardResponseSchema = z.object({
  type: z.enum(["students", "colleges"]),
  students: z.array(StudentLeaderboardRowSchema).optional(),
  colleges: z.array(CollegeLeaderboardRowSchema).optional(),
  workshopStartIso: z.string(),
});
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
export type StudentLeaderboardRow = z.infer<typeof StudentLeaderboardRowSchema>;
export type CollegeLeaderboardRow = z.infer<typeof CollegeLeaderboardRowSchema>;

/* ---------------------------------- events --------------------------------- */

export const EventRequestSchema = z.object({
  type: z.enum(CLIENT_EVENT_TYPES),
  anonId: z.string().max(64).optional(),
  props: z
    .record(z.string(), z.unknown())
    .refine(
      (props) => JSON.stringify(props).length <= MAX_EVENT_PROPS_BYTES,
      `props must be ${MAX_EVENT_PROPS_BYTES} bytes or fewer`,
    )
    .optional(),
  ...UTM_SCHEMA,
});
export type EventRequest = z.infer<typeof EventRequestSchema>;

/* --------------------------------- colleges -------------------------------- */

export const CollegeOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  city: z.string().nullable(),
});
export type CollegeOption = z.infer<typeof CollegeOptionSchema>;

export const CollegeListResponseSchema = z.array(CollegeOptionSchema);
export type CollegeListResponse = z.infer<typeof CollegeListResponseSchema>;

/* -------------------------------- ambassador ------------------------------- */

export const AmbassadorKitResponseSchema = z.object({
  code: z.string(),
  name: z.string(),
  college: z.string().nullable(),
  referralLink: z.string(),
  stats: z.object({
    registrations: z.number(),
    qualified: z.number(),
    ambassadorRank: z.number().nullable(),
    collegeRank: z.number().nullable(),
  }),
  postingWindow: z.string(),
  checklist: z.array(z.string()),
  isSimulated: z.boolean().optional(),
});
export type AmbassadorKitResponse = z.infer<typeof AmbassadorKitResponseSchema>;

/* ---------------------------------- admin ---------------------------------- */

export const AdminLoginRequestSchema = z.object({ password: z.string().min(1).max(200) });
export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;

export const AdminOverviewSchema = z.object({
  registrations: z.number(),
  target: z.number(),
  todayRegistrations: z.number(),
  referralSharePct: z.number(),
  colleges: z.number(),
  qualifiedReferrals: z.number(),
  simulatedCount: z.number(),
  includeSimulated: z.boolean(),
});
export type AdminOverview = z.infer<typeof AdminOverviewSchema>;

export const PacingPointSchema = z.object({
  day: z.number(),
  date: z.string(),
  plannedCumulative: z.number(),
  actualCumulative: z.number(),
});
export const PacingResponseSchema = z.object({
  points: z.array(PacingPointSchema),
  projectedTotal: z.number(),
  currentDay: z.number(),
  includeSimulated: z.boolean(),
});
export type PacingPoint = z.infer<typeof PacingPointSchema>;
export type PacingResponse = z.infer<typeof PacingResponseSchema>;

export const FunnelStepSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number(),
  conversionFromPrev: z.number().nullable(),
});
export type FunnelStep = z.infer<typeof FunnelStepSchema>;

export const ChannelRowSchema = z.object({
  channel: z.string(),
  registrations: z.number(),
  sharePct: z.number(),
});
export type ChannelRow = z.infer<typeof ChannelRowSchema>;

export const AdminCollegeRowSchema = z.object({
  collegeId: z.string().nullable(),
  name: z.string(),
  shortName: z.string(),
  registrations: z.number(),
  qualified: z.number(),
  ambassadors: z.number(),
  hasAmbassador: z.boolean(),
});
export type AdminCollegeRow = z.infer<typeof AdminCollegeRowSchema>;

export const AdminAmbassadorRowSchema = z.object({
  userId: z.string(),
  name: z.string(),
  college: z.string().nullable(),
  code: z.string(),
  registrations: z.number(),
  qualified: z.number(),
  lastActivityAt: z.string().nullable(),
  kitPath: z.string(),
});
export type AdminAmbassadorRow = z.infer<typeof AdminAmbassadorRowSchema>;

export const CreateAmbassadorRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  collegeId: z.string().max(60).optional(),
  collegeOther: z.string().trim().max(120).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  email: z.email().max(160).optional(),
});
export type CreateAmbassadorRequest = z.infer<typeof CreateAmbassadorRequestSchema>;

export const VariantRowSchema = z.object({
  variant: z.string(),
  landings: z.number(),
  registrations: z.number(),
  conversionPct: z.number(),
});
export type VariantRow = z.infer<typeof VariantRowSchema>;

export const FlagRowSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  reason: z.string(),
  status: z.enum(["open", "approved", "rejected"]),
  createdAt: z.string(),
});
export type FlagRow = z.infer<typeof FlagRowSchema>;

export const FlagDecisionRequestSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});
export type FlagDecisionRequest = z.infer<typeof FlagDecisionRequestSchema>;

export const DailyBriefSchema = z.object({
  generatedAt: z.string(),
  lines: z.array(z.string()),
  aiParagraph: z.string().nullable(),
  aiAvailable: z.boolean(),
});
export type DailyBrief = z.infer<typeof DailyBriefSchema>;

export const AdminAiUsageSchema = z.object({
  callsToday: z.number(),
  byKind: z.record(z.string(), z.number()),
});

/* ---------------------------------- live ----------------------------------- */

export const LiveClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join"),
    token: z.string().optional(),
    role: z.enum(["participant", "host"]).default("participant"),
    name: z.string().max(80).optional(),
  }),
  z.object({ type: z.literal("checkin") }),
  z.object({
    type: z.literal("poll_answer"),
    questionId: z.string(),
    option: z.number().int().min(0).max(9),
  }),
  z.object({
    type: z.literal("quiz_answer"),
    questionId: z.string(),
    option: z.number().int().min(0).max(9),
  }),
  z.object({ type: z.literal("stuck"), note: z.string().max(280).optional() }),
  z.object({ type: z.literal("resolve_stuck"), entryId: z.string() }),
  z.object({ type: z.literal("shipped"), url: z.string().max(500) }),
  z.object({ type: z.literal("advance_step"), step: z.number().int().min(1).max(6) }),
  z.object({
    type: z.literal("launch_poll"),
    question: z.string().max(200),
    options: z.array(z.string().max(80)).min(2).max(6),
  }),
  z.object({
    type: z.literal("launch_quiz"),
    question: z.string().max(200),
    options: z.array(z.string().max(80)).min(2).max(6),
    correct: z.number().int().min(0).max(5),
  }),
  z.object({ type: z.literal("ping") }),
]);
export type LiveClientMessage = z.infer<typeof LiveClientMessageSchema>;

export const LiveServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("state"),
    step: z.number(),
    attendance: z.number(),
    checkedIn: z.boolean(),
    role: z.enum(["participant", "host"]),
    serverTime: z.string(),
  }),
  z.object({
    type: z.literal("poll"),
    questionId: z.string(),
    question: z.string(),
    options: z.array(z.string()),
    counts: z.array(z.number()),
  }),
  z.object({
    type: z.literal("quiz"),
    questionId: z.string(),
    question: z.string(),
    options: z.array(z.string()),
    counts: z.array(z.number()),
  }),
  z.object({
    type: z.literal("stuck_queue"),
    items: z.array(z.object({ id: z.string(), name: z.string(), note: z.string().nullable() })),
  }),
  z.object({
    type: z.literal("shipped_feed"),
    items: z.array(z.object({ name: z.string(), url: z.string(), at: z.string() })),
  }),
  z.object({
    type: z.literal("leaderboard"),
    rows: z.array(z.object({ rank: z.number(), name: z.string(), score: z.number() })),
  }),
  z.object({ type: z.literal("pong") }),
  z.object({ type: z.literal("error"), code: z.string(), message: z.string() }),
]);
export type LiveServerMessage = z.infer<typeof LiveServerMessageSchema>;

/* ------------------------------- submissions ------------------------------- */

export const SubmissionRequestSchema = z.object({
  liveUrl: z.url().max(500),
  repoUrl: z.url().max(500).optional().or(z.literal("")),
  description: z.string().trim().min(10).max(600),
});
export type SubmissionRequest = z.infer<typeof SubmissionRequestSchema>;

export const EvaluationSchema = z.object({
  score: z.number().int().min(0).max(100),
  breakdown: z.object({
    worksLive: z.number().int().min(0).max(30),
    meaningfulAi: z.number().int().min(0).max(25),
    problemClarity: z.number().int().min(0).max(20),
    readmeHygiene: z.number().int().min(0).max(15),
    originality: z.number().int().min(0).max(10),
  }),
  strengths: z.array(z.string()).length(3),
  improvements: z.array(z.string()).length(3),
  nextFeature: z.string(),
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

export const SubmissionResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["queued", "evaluated", "failed", "manual"]),
  score: z.number().nullable(),
  evaluation: EvaluationSchema.nullable(),
  certId: z.string().nullable(),
  shippedCardPath: z.string(),
});
export type SubmissionResponse = z.infer<typeof SubmissionResponseSchema>;

export const CertificateResponseSchema = z.object({
  certId: z.string(),
  name: z.string(),
  college: z.string().nullable(),
  projectTitle: z.string().nullable(),
  issuedAt: z.string(),
  workshopId: z.string(),
  valid: z.boolean(),
  isSimulated: z.boolean().optional(),
});
export type CertificateResponse = z.infer<typeof CertificateResponseSchema>;

/* ------------------------------- misc client ------------------------------- */

export const ICS_PATH = "/api/me/calendar.ics";
