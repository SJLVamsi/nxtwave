/**
 * The five /plan slides (PRD M12, §3.4). Every number comes from
 * src/shared/plan.ts so the deck can never disagree with the product.
 * Visual language: display statements, hairline data rows, one signal accent.
 */
import type { ReactNode } from "react";
import { SimulatedBadge, buttonClass } from "../../design";
import { SIMULATED_LABEL } from "../../../shared/constants";
import {
  BUDGET,
  BUDGET_TOTAL,
  CALENDAR,
  CHANNELS,
  COST_PER_REGISTRATION_CEILING,
  PACING,
  PLAN_INSIGHT,
  PLANNED_REGISTRATIONS,
  REJECTED_CHANNELS,
  REFERRAL_K_FACTOR,
  STUDENT_SEGMENTS,
  TARGET_REGISTRATIONS,
} from "../../../shared/plan";

const H2 =
  "max-w-[24ch] text-[clamp(1.9rem,4.6vw,3.25rem)] font-semibold leading-[1.06] " +
  "tracking-[-0.03em] text-ink [text-wrap:balance]";
const H2_SOFT =
  "max-w-[40ch] text-[clamp(1.6rem,3.7vw,2.6rem)] font-semibold leading-[1.12] " +
  "tracking-[-0.025em] text-ink [text-wrap:balance]";
const H3 = "text-[13px] font-medium tracking-[0.01em] text-ink";
const ROW = "border-t border-hairline";
const MONO = "font-mono tabular-nums";

function SubHead({ children }: { children: ReactNode }) {
  return <h3 className={H3}>{children}</h3>;
}

/* --------------------------------- slide 1 ---------------------------------- */

const SEGMENTS = [
  { label: "Primary segment", body: STUDENT_SEGMENTS.primary },
  { label: "Secondary segment", body: STUDENT_SEGMENTS.secondary },
  { label: "Tagged and excluded from the target", body: STUDENT_SEGMENTS.excluded },
] as const;

export function Slide1Student() {
  return (
    <div className="plan-slide-inner">
      <h2 className={H2}>
        One student: final-year B.Tech, phone-first, in a class group that already trusts a
        classmate.
      </h2>
      <dl className="mt-10 grid gap-x-8 gap-y-6 md:grid-cols-3">
        {SEGMENTS.map((segment) => (
          <div key={segment.label} className="border-t border-hairline-strong pt-4">
            <dt className="font-mono text-[11px] text-ink-subtle">{segment.label}</dt>
            <dd className="mt-2 max-w-[42ch] text-[14px] leading-relaxed text-ink-muted">
              {segment.body}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 max-w-[64ch] border-t border-hairline pt-4 text-[15px] leading-relaxed text-ink-muted">
        Reach is one WhatsApp class group at a time. The campaign does not need a big audience; it
        needs a couple dozen students who already admin those groups.
      </p>
    </div>
  );
}

/* --------------------------------- slide 2 ---------------------------------- */

export function Slide2Insight() {
  return (
    <div className="plan-slide-inner">
      <h2 className={H2_SOFT}>{PLAN_INSIGHT}</h2>
      <div className="mt-10 grid gap-x-12 gap-y-8 lg:grid-cols-[1.6fr_1fr]">
        <ol>
          {CHANNELS.map((channel) => (
            <li
              key={channel.id}
              className={`py-3 first:border-t-0 first:pt-0 ${ROW}`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="min-w-0 text-[14px] font-medium text-ink">
                  <span className="mr-2 font-mono text-[11px] text-ink-subtle">
                    {String(channel.priority).padStart(2, "0")}
                  </span>
                  {channel.label}
                </p>
                <p className={`shrink-0 text-[15px] text-ink ${MONO}`}>{channel.registrations}</p>
              </div>
              <p className="mt-1 text-[12px] text-ink-subtle">
                {channel.mechanism}
                {channel.reach > 0 ? ` · reach ${channel.reach.toLocaleString("en-IN")}` : ""}
                {channel.conversion > 0
                  ? ` · conversion ${(channel.conversion * 100).toFixed(1)}%`
                  : ""}
              </p>
            </li>
          ))}
        </ol>
        <section className="border-t border-hairline-strong pt-4">
          <SubHead>
            <span className="text-danger">Rejected on purpose</span>
          </SubHead>
          <ul className="mt-1">
            {REJECTED_CHANNELS.map((line) => (
              <li
                key={line}
                className={`py-2.5 text-[13px] leading-relaxed text-ink-muted last:pb-0 ${ROW} first:border-t-0 first:pt-1`}
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* --------------------------------- slide 3 ---------------------------------- */

const CHANNEL_FILLS: Record<string, string> = {
  ambassadors: "var(--ink, var(--color-ink, #f4f6f8))",
  referral: "var(--signal, var(--color-signal, #c8f250))",
  clubs: "var(--ink-muted, var(--color-ink-muted, #b9c0c9))",
  owned: "var(--ink-subtle, var(--color-ink-subtle, #7d8590))",
  boost: "var(--hairline-strong, var(--color-hairline-strong, #3a3f47))",
};

function ChannelStack() {
  const total = CHANNELS.reduce((sum, channel) => sum + channel.registrations, 0);
  return (
    <div>
      <div
        className="flex h-9 w-full overflow-hidden rounded-control border border-hairline"
        role="img"
        aria-label={`Channel mix: ${CHANNELS.map((c) => `${c.label} ${c.registrations}`).join(", ")}`}
      >
        {CHANNELS.map((channel) => (
          <div
            key={channel.id}
            className="h-full border-r border-hairline last:border-r-0"
            style={{
              width: `${(channel.registrations / total) * 100}%`,
              background: CHANNEL_FILLS[channel.id],
            }}
            title={`${channel.label}: ${channel.registrations}`}
          />
        ))}
      </div>
      <ul className="mt-2">
        {CHANNELS.map((channel) => (
          <li
            key={channel.id}
            className={`flex items-center justify-between gap-3 border-b border-hairline py-1.5 last:border-b-0`}
          >
            <span className="flex min-w-0 items-center gap-2 text-[12px] text-ink-muted">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 shrink-0 rounded-[2px] border border-hairline"
                style={{ background: CHANNEL_FILLS[channel.id] }}
              />
              <span className="truncate">{channel.label}</span>
            </span>
            <span className={`shrink-0 text-[12px] text-ink ${MONO}`}>{channel.registrations}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Slide3Math() {
  const referral = CHANNELS.find((channel) => channel.id === "referral");
  const referralRegistrations = referral?.registrations ?? 0;
  const nonReferral = PLANNED_REGISTRATIONS - referralRegistrations;
  return (
    <div className="plan-slide-inner">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className={H2}>
          {PLANNED_REGISTRATIONS} planned registrations against a {TARGET_REGISTRATIONS} target
        </h2>
        <SimulatedBadge />
      </div>
      <div className="mt-8 grid gap-x-12 gap-y-8 lg:grid-cols-[1.25fr_1fr]">
        <section>
          <SubHead>Channel mix plan</SubHead>
          <div className="mt-3">
            <ChannelStack />
          </div>
          <p className="mt-4 max-w-[58ch] text-[14px] leading-relaxed text-ink-muted">
            The referral loop adds a k-factor of ≈&nbsp;{REFERRAL_K_FACTOR} on the {nonReferral}{" "}
            non-referral registrations: those students bring {referralRegistrations} more without a
            new channel.
          </p>
          <p className="mt-3 max-w-[62ch] text-[12px] leading-relaxed text-ink-subtle">
            {SIMULATED_LABEL}: plan simulation from <code className="font-mono">src/shared/plan.ts</code>.
            These are targets, not measured campaign results. Seeded numbers are labelled in the
            admin war room.
          </p>
        </section>
        <section className="border-t border-hairline-strong pt-4">
          <SubHead>Budget</SubHead>
          <table className="mt-3 w-full border-collapse text-left">
            <tbody>
              {BUDGET.map((item) => (
                <tr key={item.item} className="border-b border-hairline">
                  <td className="py-2.5 pr-3 text-[13px] text-ink-muted">{item.item}</td>
                  <td className={`py-2.5 text-right text-[13px] text-ink ${MONO}`}>
                    ₹{item.amount.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="pt-2.5 pr-3 text-[13px] font-medium text-ink">Total</td>
                <td className={`pt-2.5 text-right text-[13px] font-medium text-ink ${MONO}`}>
                  ₹{BUDGET_TOTAL.toLocaleString("en-IN")}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 max-w-[46ch] text-[13px] leading-relaxed text-ink-muted">
            Ceiling: ₹{COST_PER_REGISTRATION_CEILING} per registration. The boost test is killed
            above it.
          </p>
        </section>
      </div>
      <div className="mt-6 grid gap-x-8 gap-y-3 md:grid-cols-2">
        {BUDGET.filter((item) => item.item !== "Infrastructure").map((item) => (
          <p
            key={item.item}
            className={`pt-3 text-[12px] leading-relaxed text-ink-muted ${ROW}`}
          >
            <span className="font-medium text-ink">{item.item}:</span> {item.rule}
          </p>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- slide 4 ---------------------------------- */

function PacingChart() {
  const width = 720;
  const height = 230;
  const padX = 46;
  const padY = 28;
  const max = PACING[PACING.length - 1];
  const yFor = (value: number) => height - padY - (value / max) * (height - padY * 2);
  const points = PACING.map((value, index) => {
    const x = padX + (index * (width - padX * 2)) / (PACING.length - 1);
    return { x, y: yFor(value), value, day: index + 1 };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const targetY = yFor(TARGET_REGISTRATIONS);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Planned cumulative registrations: ${PACING.join(", ")} on days 1 to 7. Target ${TARGET_REGISTRATIONS}.`}
      className="plan-chart h-auto w-full"
    >
      <title>Planned cumulative registrations by day, against the {TARGET_REGISTRATIONS} target</title>
      {[0, 130, 260, 390, 520].map((tick) => {
        const y = yFor(tick);
        return (
          <g key={tick}>
            <line className="plan-grid" x1={padX} y1={y} x2={width - padX} y2={y} strokeWidth="1" />
            <text className="plan-axis" x={padX - 10} y={y + 4} textAnchor="end" fontSize="11">
              {tick}
            </text>
          </g>
        );
      })}
      <line
        className="plan-target"
        x1={padX}
        y1={targetY}
        x2={width - padX}
        y2={targetY}
        strokeWidth="1"
        strokeDasharray="2 4"
      />
      <text className="plan-target-label" x={padX + 6} y={targetY - 6} textAnchor="start" fontSize="10">
        target {TARGET_REGISTRATIONS}
      </text>
      <polyline className="plan-series" points={line} fill="none" strokeWidth="2" strokeLinejoin="round" />
      {points.map((point) => (
        <g key={point.day}>
          <circle className="plan-dot" cx={point.x} cy={point.y} r="2.5" />
          <text
            className="plan-value"
            x={point.x}
            y={point.y - 12}
            textAnchor="middle"
            fontSize="12"
            fontWeight="500"
          >
            {point.value}
          </text>
          <text className="plan-axis" x={point.x} y={height - 6} textAnchor="middle" fontSize="11">
            D{point.day}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function Slide4Calendar() {
  return (
    <div className="plan-slide-inner">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className={H2}>Seven-day plan and the daily loop</h2>
        <SimulatedBadge />
      </div>
      <div className="mt-6 grid gap-x-12 gap-y-8 lg:grid-cols-[1.15fr_1fr]">
        <ol>
          {CALENDAR.map((entry, index) => (
            <li
              key={entry.day}
              className={`grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-3 py-2.5 md:gap-4 ${
                index > 0 ? ROW : ""
              }`}
            >
              <span className="font-mono text-[11px] text-ink-subtle">
                D{entry.day} · {entry.weekday}
              </span>
              <span className="text-[13px] leading-relaxed text-ink-muted">{entry.action}</span>
              <span className={`text-[13px] text-ink ${MONO}`}>{entry.cumulative}</span>
            </li>
          ))}
        </ol>
        <section className="rounded-panel border border-hairline bg-surface-1 p-4">
          <SubHead>Planned cumulative registrations</SubHead>
          <div className="mt-3">
            <PacingChart />
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-subtle">
            {SIMULATED_LABEL}: the curve is the plan simulation from{" "}
            <code className="font-mono">src/shared/plan.ts</code>, not measured campaign data. The
            admin war room charts plan vs seeded actuals with the same constants.
          </p>
        </section>
      </div>
      <p className="mt-6 max-w-[70ch] border-t border-hairline pt-4 text-[14px] leading-relaxed text-ink-muted">
        Daily 9 PM review: pacing vs plan, top and bottom colleges, which share variant is producing
        referral visits, and flagged signups. Every day ends with one decision written down.
      </p>
    </div>
  );
}

/* --------------------------------- slide 5 ---------------------------------- */

const MODULES = [
  {
    name: "Landing + AI project preview",
    detail: "pick branch + interest, get a project card, register inline",
  },
  {
    name: "Referral attribution + fraud guards",
    detail: "readable ref codes, OG previews, flags queue",
  },
  { name: "My Launchpad", detail: "seat ticket, referral link, reward tiers, ranks" },
  { name: "Share cards", detail: "PNG story and feed cards generated in the Worker" },
  { name: "Leaderboards", detail: "students and colleges, cached 60 s" },
  { name: "Admin war room", detail: "pacing, funnel, channels, flags, daily brief" },
  { name: "Ambassador kit", detail: "link, three message variants, personal stats" },
  { name: "Live workshop room", detail: "check-in, polls, quiz, help queue (Durable Object)" },
  {
    name: "AI evaluator + certificates",
    detail: "rubric score, strengths, improvements, verifiable cert",
  },
  { name: "/plan and /build", detail: "this deck and the architecture/decision notes" },
];

const FUNNEL = [
  "Landing view",
  "Idea generated",
  "Form started",
  "Registered",
  "Shared",
  "Referral landing",
  "Referral registered",
  "Checked in",
  "Project submitted",
];

export function Slide5Built() {
  return (
    <div className="plan-slide-inner">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className={H2}>What we built and how it measures itself</h2>
        <SimulatedBadge />
      </div>
      <div className="mt-6 grid gap-x-12 gap-y-8 lg:grid-cols-2">
        <section>
          <SubHead>The product</SubHead>
          <ul className="mt-2">
            {MODULES.map((module, index) => (
              <li
                key={module.name}
                className={`py-2 text-[12px] leading-relaxed text-ink-muted ${
                  index > 0 ? ROW : ""
                }`}
              >
                <span className="font-medium text-ink">{module.name}</span>
                <span className="text-ink-subtle"> — {module.detail}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <SubHead>How it measures itself</SubHead>
          <ol className="mt-2">
            {FUNNEL.map((step, index) => (
              <li
                key={step}
                className={`flex items-baseline gap-3 py-1.5 text-[12px] text-ink-muted ${
                  index > 0 ? ROW : ""
                }`}
              >
                <span className="font-mono text-[11px] text-ink-subtle">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-hairline pt-4 text-[13px] leading-relaxed text-ink-muted">
            Every step writes an event. The admin war room compares the actual cumulative curve to
            the planned curve from <code className="font-mono">src/shared/plan.ts</code> and
            projects the day-7 total from the current run rate. Seeded demo rows are marked{" "}
            {SIMULATED_LABEL}.
          </p>
          <div className="plan-map-cta mt-5 flex flex-wrap gap-3">
            <a href="/build" className={buttonClass({ variant: "primary" })}>
              How it was built — /build
            </a>
            <a href="/" className={buttonClass({ variant: "secondary" })}>
              Open the live product
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
