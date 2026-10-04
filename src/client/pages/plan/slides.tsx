/**
 * WS8 — the five /plan slides (PRD M12, §3.4). Every number comes from
 * src/shared/plan.ts so the deck can never disagree with the product.
 */
import type { ReactNode } from "react";
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

const CHANNEL_COLORS: Record<string, string> = {
  ambassadors: "#1F3A93",
  referral: "#D7263D",
  clubs: "#3B5BA5",
  owned: "#6E7BA6",
  boost: "#B7791F",
};

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold tracking-widest text-[#1F3A93] uppercase">
      {children}
    </p>
  );
}

function SimulatedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-[#D7263D] bg-[#FFF3F4] px-2 py-0.5 text-[11px] font-semibold text-[#D7263D]">
      {SIMULATED_LABEL}
    </span>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded border border-[#DDE5F2] bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Slide1Student() {
  return (
    <div>
      <Kicker>Slide 1 · The student</Kicker>
      <h2 className="max-w-4xl text-2xl font-bold text-[#2E333B] sm:text-3xl">
        One student: final-year B.Tech, phone-first, in a class group that already trusts a
        classmate.
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <h3 className="text-sm font-semibold text-[#1F3A93]">Primary segment</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#2E333B]">{STUDENT_SEGMENTS.primary}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-[#1F3A93]">Secondary segment</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#2E333B]">
            {STUDENT_SEGMENTS.secondary}
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-[#1F3A93]">
            Tagged and excluded from the target
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#2E333B]">{STUDENT_SEGMENTS.excluded}</p>
        </Card>
      </div>
      <div className="mt-6 rounded border-l-4 border-[#DDE5F2] bg-[#F4F7FD] p-4 text-sm text-[#2E333B]">
        Reach is one WhatsApp class group at a time. The campaign does not need a big audience; it
        needs a couple dozen students who already admin those groups.
      </div>
    </div>
  );
}

export function Slide2Insight() {
  return (
    <div>
      <Kicker>Slide 2 · The insight and the channels</Kicker>
      <blockquote className="max-w-4xl border-l-4 border-[#1F3A93] pl-4 text-xl leading-snug font-semibold text-[#2E333B] sm:text-2xl">
        {PLAN_INSIGHT}
      </blockquote>
      <div className="mt-6 grid gap-2">
        {CHANNELS.map((channel) => (
          <div key={channel.id} className="rounded border border-[#DDE5F2] bg-white p-3 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-[#2E333B]">
                {channel.priority}. {channel.label}
              </p>
              <p className="shrink-0 text-sm font-semibold text-[#1F3A93]">
                {channel.registrations}
              </p>
            </div>
            <p className="mt-1 text-xs text-[#6E7BA6]">
              {channel.mechanism}
              {channel.reach > 0 ? ` · reach ${channel.reach.toLocaleString("en-IN")}` : ""}
              {channel.conversion > 0
                ? ` · conversion ${(channel.conversion * 100).toFixed(1)}%`
                : ""}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-[#D7263D]">Rejected on purpose</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#2E333B]">
          {REJECTED_CHANNELS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ChannelStack() {
  const total = CHANNELS.reduce((sum, channel) => sum + channel.registrations, 0);
  return (
    <div>
      <div className="flex h-10 w-full overflow-hidden rounded border border-[#DDE5F2]">
        {CHANNELS.map((channel) => (
          <div
            key={channel.id}
            className="flex items-center justify-center text-[10px] font-semibold text-white sm:text-xs"
            style={{
              width: `${(channel.registrations / total) * 100}%`,
              background: CHANNEL_COLORS[channel.id] ?? "#2E333B",
            }}
            title={`${channel.label}: ${channel.registrations}`}
          >
            {channel.registrations}
          </div>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#2E333B]">
        {CHANNELS.map((channel) => (
          <span key={channel.id} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ background: CHANNEL_COLORS[channel.id] ?? "#2E333B" }}
            />
            {channel.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Slide3Math() {
  const referral = CHANNELS.find((channel) => channel.id === "referral");
  const referralRegistrations = referral?.registrations ?? 0;
  const nonReferral = PLANNED_REGISTRATIONS - referralRegistrations;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Kicker>Slide 3 · How the 500 come in + budget</Kicker>
        <SimulatedBadge />
      </div>
      <div className="mt-2 grid gap-4 md:grid-cols-[2fr_1fr]">
        <Card>
          <h3 className="text-sm font-semibold text-[#1F3A93]">
            Channel mix plan · {PLANNED_REGISTRATIONS} registrations against a{" "}
            {TARGET_REGISTRATIONS} target
          </h3>
          <div className="mt-4">
            <ChannelStack />
          </div>
          <p className="mt-4 text-sm text-[#2E333B]">
            The referral loop adds a k-factor of ≈ {REFERRAL_K_FACTOR} on the {nonReferral}{" "}
            non-referral registrations: those students bring {referralRegistrations} more without a
            new channel.
          </p>
          <p className="mt-2 text-[11px] text-[#6E7BA6]">
            {SIMULATED_LABEL}: plan simulation from <code>src/shared/plan.ts</code>. These are
            targets, not measured campaign results. Actually seeded numbers are generated by{" "}
            <code>scripts/seed.ts</code> and labelled in the admin war room.
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-[#1F3A93]">Budget</h3>
          <table className="mt-3 w-full border-collapse text-left text-sm">
            <tbody>
              {BUDGET.map((item) => (
                <tr key={item.item} className="border-b border-[#DDE5F2]">
                  <td className="py-2 pr-2 font-medium text-[#2E333B]">{item.item}</td>
                  <td className="py-2 text-right text-[#2E333B]">
                    ₹{item.amount.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="pt-2 pr-2 font-semibold text-[#2E333B]">Total</td>
                <td className="pt-2 text-right font-semibold text-[#2E333B]">
                  ₹{BUDGET_TOTAL.toLocaleString("en-IN")}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-sm text-[#2E333B]">
            Ceiling: ₹{COST_PER_REGISTRATION_CEILING} per registration. The boost test is killed
            above it.
          </p>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {BUDGET.filter((item) => item.item !== "Infrastructure").map((item) => (
          <div
            key={item.item}
            className="rounded border-l-4 border-[#D7263D] bg-white p-3 text-xs text-[#2E333B] shadow-sm"
          >
            <span className="font-semibold">{item.item}:</span> {item.rule}
          </div>
        ))}
      </div>
    </div>
  );
}

function PacingChart() {
  const width = 720;
  const height = 220;
  const padX = 40;
  const padY = 24;
  const max = PACING[PACING.length - 1];
  const points = PACING.map((value, index) => {
    const x = padX + (index * (width - padX * 2)) / (PACING.length - 1);
    const y = height - padY - (value / max) * (height - padY * 2);
    return { x, y, value, day: index + 1 };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Planned cumulative registrations: ${PACING.join(", ")} on days 1 to 7`}
      className="h-auto w-full"
    >
      <title>Planned cumulative registrations by day</title>
      {[0, 130, 260, 390, 520].map((tick) => {
        const y = height - padY - (tick / max) * (height - padY * 2);
        return (
          <g key={tick}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#DDE5F2" strokeWidth="1" />
            <text x={padX - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#6E7BA6">
              {tick}
            </text>
          </g>
        );
      })}
      <polyline points={line} fill="none" stroke="#1F3A93" strokeWidth="3" />
      {points.map((point) => (
        <g key={point.day}>
          <circle cx={point.x} cy={point.y} r="4" fill="#D7263D" />
          <text
            x={point.x}
            y={point.y - 10}
            textAnchor="middle"
            fontSize="12"
            fill="#2E333B"
            fontWeight="600"
          >
            {point.value}
          </text>
          <text x={point.x} y={height - 6} textAnchor="middle" fontSize="11" fill="#6E7BA6">
            Day {point.day}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function Slide4Calendar() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Kicker>Slide 4 · Seven-day plan and the daily loop</Kicker>
        <SimulatedBadge />
      </div>
      <div className="mt-2 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#DDE5F2] text-[11px] tracking-wide text-[#1F3A93] uppercase">
                <th className="py-2 pr-2">Day</th>
                <th className="py-2 pr-2">Action</th>
                <th className="py-2 text-right">Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {CALENDAR.map((entry) => (
                <tr key={entry.day} className="border-b border-[#DDE5F2] align-top">
                  <td className="py-2 pr-2 whitespace-nowrap font-medium text-[#2E333B]">
                    {entry.day} · {entry.weekday}
                  </td>
                  <td className="py-2 pr-2 text-[#2E333B]">{entry.action}</td>
                  <td className="py-2 text-right font-semibold text-[#2E333B]">
                    {entry.cumulative}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Card>
          <h3 className="text-sm font-semibold text-[#1F3A93]">Planned cumulative registrations</h3>
          <div className="mt-2">
            <PacingChart />
          </div>
          <p className="mt-2 text-[11px] text-[#6E7BA6]">
            {SIMULATED_LABEL}: the curve is the plan simulation from <code>src/shared/plan.ts</code>
            , not measured campaign data. The admin war room charts plan vs seeded actuals with the
            same constants.
          </p>
        </Card>
      </div>
      <div className="mt-4 rounded border-l-4 border-[#1F3A93] bg-[#F4F7FD] p-3 text-sm text-[#2E333B]">
        Daily 9 PM review: pacing vs plan, top and bottom colleges, which share variant is producing
        referral visits, and flagged signups. Every day ends with one decision written down.
      </div>
    </div>
  );
}

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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Kicker>Slide 5 · What we built and how it measures itself</Kicker>
        <SimulatedBadge />
      </div>
      <div className="mt-2 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-[#1F3A93]">The product</h3>
          <ul className="mt-2 grid gap-2 text-sm text-[#2E333B]">
            {MODULES.map((module) => (
              <li
                key={module.name}
                className="rounded border border-[#DDE5F2] bg-white p-2 shadow-sm"
              >
                <span className="font-medium">{module.name}</span>
                <span className="text-[#6E7BA6]"> — {module.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1F3A93]">How it measures itself</h3>
          <ol className="mt-2 flex flex-wrap gap-2">
            {FUNNEL.map((step, index) => (
              <li
                key={step}
                className="rounded border border-[#DDE5F2] bg-[#F4F7FD] px-2 py-1 text-xs font-medium text-[#2E333B]"
              >
                {index + 1}. {step}
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded border-l-4 border-[#D7263D] bg-white p-3 text-sm text-[#2E333B] shadow-sm">
            Every step writes an event. The admin war room compares the actual cumulative curve to
            the planned curve from <code>src/shared/plan.ts</code> and projects the day-7 total from
            the current run rate. Seeded demo rows are marked {SIMULATED_LABEL}.
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <a
              href="/build"
              className="rounded bg-[#1F3A93] px-4 py-2 text-white no-underline hover:bg-[#16295f]"
            >
              How it was built — /build
            </a>
            <a
              href="/"
              className="rounded border border-[#1F3A93] px-4 py-2 text-[#1F3A93] no-underline hover:bg-[#F4F7FD]"
            >
              Open the live product
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
