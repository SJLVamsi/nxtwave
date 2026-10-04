import { Suspense, lazy, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type {
  AdminAmbassadorRow,
  AdminCollegeRow,
  AdminOverview,
  ChannelRow,
  DailyBrief,
  FlagRow,
  FunnelStep,
  PacingResponse,
  VariantRow,
} from "../../../shared/contracts";
import { SIMULATED_LABEL } from "../../../shared/constants";
import type { AdminAiUsage, CreateAmbassadorInput } from "./api";
import type { PacingChartPoint } from "./PacingChart";

const PacingChart = lazy(() => import("./PacingChart"));

/* ---------------------------------- basics ---------------------------------- */

export function Section({
  title,
  subtitle,
  aside,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border border-[#DDE5F2] bg-white ${className}`}>
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-[#DDE5F2] px-3 py-2">
        <h2 className="text-sm font-semibold text-[#1F3A93]">{title}</h2>
        {subtitle ? <p className="text-[11px] text-[#2E333B]/60">{subtitle}</p> : null}
        {aside ? <div className="ml-auto">{aside}</div> : null}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-[#DDE5F2] text-[11px] text-[#2E333B]/60">
            {head.map((heading) => (
              <th key={heading} className="px-2 py-1.5 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border-b border-[#DDE5F2]/70 px-2 py-1.5 align-top ${className}`}>{children}</td>;
}

function Stat({
  label,
  value,
  detail,
  progress,
}: {
  label: string;
  value: string;
  detail: string;
  progress?: number;
}) {
  return (
    <div className="rounded-md border border-[#DDE5F2] bg-white px-3 py-2">
      <p className="text-[11px] text-[#2E333B]/60">{label}</p>
      <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-[#2E333B]">{value}</p>
      <p className="text-[11px] text-[#2E333B]/60">{detail}</p>
      {progress !== undefined ? (
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#DDE5F2]">
          <div className="h-1.5 rounded-full bg-[#1F3A93]" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function StatCards({ overview }: { overview: AdminOverview }) {
  const pct =
    overview.target > 0
      ? Math.min(100, Math.round((overview.registrations / overview.target) * 100))
      : 0;
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
      <Stat
        label="Registrations"
        value={String(overview.registrations)}
        detail={`of ${overview.target} · ${pct}%`}
        progress={pct}
      />
      <Stat label="Today" value={String(overview.todayRegistrations)} detail="new registrations" />
      <Stat label="From referrals" value={`${overview.referralSharePct}%`} detail="of registrations" />
      <Stat label="Colleges" value={String(overview.colleges)} detail="with registrations" />
      <Stat
        label="Qualified referrals"
        value={String(overview.qualifiedReferrals)}
        detail="checked in"
      />
    </div>
  );
}

export function SimulatedBanner({
  overview,
  onToggle,
  refreshing,
}: {
  overview: AdminOverview;
  onToggle: (include: boolean) => void;
  refreshing: boolean;
}) {
  if (overview.simulatedCount <= 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-[#FFE45C] bg-[#FFE45C]/25 px-3 py-2 text-xs text-[#2E333B]">
      <span className="font-semibold">{SIMULATED_LABEL}</span>
      <span>
        {overview.simulatedCount} simulated registrations in the database. This view currently{" "}
        <strong>{overview.includeSimulated ? "includes" : "excludes"}</strong> them.
      </span>
      <label className="ml-auto inline-flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={overview.includeSimulated}
          disabled={refreshing}
          onChange={(event) => onToggle(event.target.checked)}
          className="h-4 w-4 accent-[#1F3A93]"
        />
        Include simulated
      </label>
    </div>
  );
}

/* ----------------------------------- pacing --------------------------------- */

export function PacingPanel({
  pacing,
  includeSimulated,
  onEnableSimulated,
}: {
  pacing: PacingResponse;
  includeSimulated: boolean;
  onEnableSimulated: () => void;
}) {
  const [replayDay, setReplayDay] = useState<number | null>(null);
  const total = pacing.points.length;

  useEffect(() => {
    if (replayDay === null) return;
    if (replayDay >= total) {
      const done = setTimeout(() => setReplayDay(null), 1600);
      return () => clearTimeout(done);
    }
    const timer = setTimeout(() => setReplayDay((day) => Math.min((day ?? 0) + 1, total)), 2800);
    return () => clearTimeout(timer);
  }, [replayDay, total]);

  function startReplay() {
    if (!includeSimulated) onEnableSimulated();
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReplayDay(reduced ? total : 1);
  }

  const chartPoints: PacingChartPoint[] = pacing.points.map((point, index) => {
    if (replayDay === null || index < replayDay) return point;
    return { ...point, plannedCumulative: null, actualCumulative: null };
  });

  return (
    <Section
      title="Pacing vs plan"
      subtitle="Cumulative registrations against the day-by-day plan"
      aside={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startReplay}
            className="rounded-sm border border-[#1F3A93] px-2 py-1 text-[11px] font-medium text-[#1F3A93] hover:bg-[#1F3A93]/5"
          >
            {replayDay !== null ? `Replaying day ${replayDay} of ${total}…` : "Time-lapse replay (7 days)"}
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pb-2 text-xs text-[#2E333B]">
        <span>
          Current day: <strong>{pacing.currentDay > 0 ? pacing.currentDay : "—"}</strong> of {total}
        </span>
        <span>
          Projected day-7 total:{" "}
          <strong className="font-mono tabular-nums">{pacing.projectedTotal}</strong>
        </span>
        {includeSimulated ? (
          <span className="rounded-sm bg-[#FFE45C]/40 px-1.5 py-0.5 text-[10px]">
            {SIMULATED_LABEL}
          </span>
        ) : null}
      </div>
      <Suspense fallback={<div className="h-60 w-full animate-pulse rounded bg-[#DDE5F2]/50 sm:h-72" />}>
        <PacingChart points={chartPoints} />
      </Suspense>
    </Section>
  );
}

/* ----------------------------------- funnel --------------------------------- */

export function FunnelPanel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(...steps.map((step) => step.count), 1);
  return (
    <Section title="Funnel" subtitle="Landing view → referral registration">
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.key} className="grid grid-cols-[8.5rem_1fr_5rem] items-center gap-2 text-xs">
            <span className="truncate text-[#2E333B]">{step.label}</span>
            <div className="h-4 rounded-sm bg-[#DDE5F2]/60">
              <div
                className="h-4 rounded-sm bg-[#1F3A93]"
                style={{ width: `${Math.max(step.count > 0 ? 2 : 0, (step.count / max) * 100)}%` }}
              />
            </div>
            <span className="text-right font-mono tabular-nums text-[#2E333B]">
              {step.count}
              {step.conversionFromPrev !== null ? (
                <span className="ml-1 text-[10px] opacity-60">{step.conversionFromPrev}%</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------- channels -------------------------------- */

export function ChannelsPanel({ rows }: { rows: ChannelRow[] }) {
  return (
    <Section title="Channels" subtitle="Referral vs UTM source / medium">
      <Table head={["Channel", "Registrations", "Share"]}>
        {rows.map((row) => (
          <tr key={row.channel}>
            <Td>{row.channel}</Td>
            <Td className="font-mono tabular-nums">{row.registrations}</Td>
            <Td className="font-mono tabular-nums">{row.sharePct}%</Td>
          </tr>
        ))}
        {rows.length === 0 ? (
          <tr>
            <Td className="text-[#2E333B]/60">No registrations yet.</Td>
            <Td>{""}</Td>
            <Td>{""}</Td>
          </tr>
        ) : null}
      </Table>
    </Section>
  );
}

/* ---------------------------------- colleges -------------------------------- */

export function CollegesPanel({ rows }: { rows: AdminCollegeRow[] }) {
  return (
    <Section
      title="Colleges"
      subtitle="“No ambassador yet” is highlighted — those are the day-3 checkpoint targets"
    >
      <Table head={["College", "Registrations", "Qualified", "Ambassadors", "Ambassador status"]}>
        {rows.map((row) => (
          <tr key={`${row.collegeId ?? "other"}:${row.name}`} className={row.hasAmbassador ? "" : "bg-[#FFE45C]/15"}>
            <Td>
              <span className="font-medium">{row.shortName}</span>
              {row.collegeId === null ? (
                <span className="ml-1 text-[10px] text-[#2E333B]/50">other</span>
              ) : null}
            </Td>
            <Td className="font-mono tabular-nums">{row.registrations}</Td>
            <Td className="font-mono tabular-nums">{row.qualified}</Td>
            <Td className="font-mono tabular-nums">{row.ambassadors}</Td>
            <Td>
              {row.hasAmbassador ? (
                <span className="text-[#1F3A93]">covered</span>
              ) : (
                <span className="rounded-sm bg-[#D7263D]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#D7263D]">
                  No ambassador yet
                </span>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* --------------------------------- ambassadors ------------------------------ */

export function AmbassadorsPanel({
  rows,
  colleges,
  onCreate,
}: {
  rows: AdminAmbassadorRow[];
  colleges: AdminCollegeRow[];
  onCreate: (input: CreateAmbassadorInput) => Promise<void>;
}) {
  const collegeOptions = colleges.filter((college) => college.collegeId !== null);
  const [name, setName] = useState("");
  const [collegeChoice, setCollegeChoice] = useState("");
  const [collegeOther, setCollegeOther] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        name,
        collegeId: collegeChoice && collegeChoice !== "__other" ? collegeChoice : undefined,
        collegeOther: collegeChoice === "__other" ? collegeOther : undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      setName("");
      setPhone("");
      setEmail("");
      setCollegeOther("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the ambassador.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Ambassadors" subtitle="Registrations and qualified referrals they drove">
      <Table head={["Name", "College", "Code", "Registrations", "Qualified", "Last activity"]}>
        {rows.map((row) => (
          <tr key={row.userId}>
            <Td>{row.name}</Td>
            <Td>{row.college ?? "—"}</Td>
            <Td>
              <a className="font-mono text-[#1F3A93] underline" href={row.kitPath} target="_blank" rel="noreferrer">
                {row.code}
              </a>
            </Td>
            <Td className="font-mono tabular-nums">{row.registrations}</Td>
            <Td className="font-mono tabular-nums">{row.qualified}</Td>
            <Td className="text-[11px] text-[#2E333B]/70">
              {row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleString() : "—"}
            </Td>
          </tr>
        ))}
        {rows.length === 0 ? (
          <tr>
            <Td className="text-[#2E333B]/60">No ambassadors yet.</Td>
            <Td>{""}</Td>
            <Td>{""}</Td>
            <Td>{""}</Td>
            <Td>{""}</Td>
            <Td>{""}</Td>
          </tr>
        ) : null}
      </Table>

      <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-[11px] text-[#2E333B]/70">
          Name
          <input
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-0.5 w-full rounded-sm border border-[#DDE5F2] px-2 py-1 text-xs text-[#2E333B]"
          />
        </label>
        <label className="text-[11px] text-[#2E333B]/70">
          College
          <select
            value={collegeChoice}
            onChange={(event) => setCollegeChoice(event.target.value)}
            className="mt-0.5 w-full rounded-sm border border-[#DDE5F2] bg-white px-2 py-1 text-xs text-[#2E333B]"
          >
            <option value="">No college</option>
            {collegeOptions.map((college) => (
              <option key={college.collegeId} value={college.collegeId ?? ""}>
                {college.name}
              </option>
            ))}
            <option value="__other">Other…</option>
          </select>
        </label>
        {collegeChoice === "__other" ? (
          <label className="text-[11px] text-[#2E333B]/70">
            College name
            <input
              value={collegeOther}
              onChange={(event) => setCollegeOther(event.target.value)}
              className="mt-0.5 w-full rounded-sm border border-[#DDE5F2] px-2 py-1 text-xs text-[#2E333B]"
            />
          </label>
        ) : null}
        <label className="text-[11px] text-[#2E333B]/70">
          Phone (optional)
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-0.5 w-full rounded-sm border border-[#DDE5F2] px-2 py-1 text-xs text-[#2E333B]"
          />
        </label>
        <label className="text-[11px] text-[#2E333B]/70">
          Email (optional)
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-0.5 w-full rounded-sm border border-[#DDE5F2] px-2 py-1 text-xs text-[#2E333B]"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-sm bg-[#1F3A93] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#182e75] disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Creating…" : "Create ambassador"}
          </button>
        </div>
      </form>
      {error ? <p className="mt-2 text-xs text-[#D7263D]">{error}</p> : null}
    </Section>
  );
}

/* ---------------------------------- variants -------------------------------- */

export function VariantsPanel({ rows }: { rows: VariantRow[] }) {
  return (
    <Section title="Share variants" subtitle="Landings and registrations per WhatsApp message">
      <Table head={["Variant", "Landings", "Registrations", "Conversion"]}>
        {rows.map((row) => (
          <tr key={row.variant}>
            <Td className="font-mono">{row.variant}</Td>
            <Td className="font-mono tabular-nums">{row.landings}</Td>
            <Td className="font-mono tabular-nums">{row.registrations}</Td>
            <Td className="font-mono tabular-nums">{row.conversionPct}%</Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* ----------------------------------- flags ---------------------------------- */

export function FlagsPanel({
  rows,
  busyId,
  onDecide,
}: {
  rows: FlagRow[];
  busyId: string | null;
  onDecide: (userId: string, decision: "approve" | "reject") => void;
}) {
  const open = rows.filter((row) => row.status === "open");
  return (
    <Section title="Flags queue" subtitle="Fraud-guard hits stay in the database until reviewed">
      {open.length === 0 ? (
        <p className="pb-2 text-xs text-[#2E333B]/60">No open flags.</p>
      ) : null}
      <Table head={["Name", "Contact", "Reason", "Status", "Actions"]}>
        {rows.map((row) => (
          <tr key={row.userId}>
            <Td>{row.name}</Td>
            <Td className="text-[11px]">
              <span className="block">{row.email}</span>
              <span className="block text-[#2E333B]/60">{row.phone}</span>
            </Td>
            <Td className="font-mono text-[11px]">{row.reason}</Td>
            <Td>
              <span
                className={
                  row.status === "open"
                    ? "rounded-sm bg-[#D7263D]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#D7263D]"
                    : "text-[11px] text-[#2E333B]/60"
                }
              >
                {row.status}
              </span>
            </Td>
            <Td>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={busyId === row.userId || row.status !== "open"}
                  onClick={() => onDecide(row.userId, "approve")}
                  className="rounded-sm border border-[#1F3A93] px-2 py-0.5 text-[11px] text-[#1F3A93] hover:bg-[#1F3A93]/5 disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === row.userId || row.status !== "open"}
                  onClick={() => onDecide(row.userId, "reject")}
                  className="rounded-sm border border-[#D7263D] px-2 py-0.5 text-[11px] text-[#D7263D] hover:bg-[#D7263D]/5 disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

/* ----------------------------------- brief ---------------------------------- */

export function BriefPanel({
  brief,
  loading,
  onGenerate,
}: {
  brief: DailyBrief | null;
  loading: boolean;
  onGenerate: () => void;
}) {
  return (
    <Section
      title="Daily brief"
      subtitle="Rule-based recommendations plus an optional AI paragraph"
      aside={
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="rounded-sm border border-[#1F3A93] px-2 py-1 text-[11px] font-medium text-[#1F3A93] hover:bg-[#1F3A93]/5 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate brief"}
        </button>
      }
    >
      {brief === null && !loading ? (
        <p className="text-xs text-[#2E333B]/60">No brief generated yet.</p>
      ) : null}
      {brief ? (
        <div className="space-y-2 text-xs text-[#2E333B]">
          <ul className="list-disc space-y-1 pl-4">
            {brief.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {brief.aiParagraph ? (
            <p className="rounded-sm border border-[#DDE5F2] bg-[#FBFCFE] p-2">
              <span className="mr-1 rounded-sm bg-[#1F3A93]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#1F3A93]">
                AI summary
              </span>
              {brief.aiParagraph}
            </p>
          ) : (
            <p className="text-[11px] text-[#2E333B]/50">
              AI summary unavailable — rule-based lines only.
            </p>
          )}
          <p className="text-[10px] text-[#2E333B]/50">
            Generated {new Date(brief.generatedAt).toLocaleString()}
          </p>
        </div>
      ) : null}
    </Section>
  );
}

/* ----------------------------------- export --------------------------------- */

export function ExportPanel({
  includeSimulated,
  onExport,
}: {
  includeSimulated: boolean;
  onExport: (include: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      await onExport(includeSimulated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Export" subtitle="Admin-only CSV with every follow-up field">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="rounded-sm bg-[#1F3A93] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#182e75] disabled:opacity-50"
      >
        {busy ? "Preparing…" : "Download registrations CSV"}
      </button>
      <p className="mt-1.5 text-[11px] text-[#2E333B]/60">
        Includes name, email, phone, college, branch, UTM, referral and check-in status
        {includeSimulated ? " — simulated rows included." : " — simulated rows excluded."}
      </p>
      {error ? <p className="mt-1 text-xs text-[#D7263D]">{error}</p> : null}
    </Section>
  );
}

/* ---------------------------------- ai usage -------------------------------- */

export function AiUsagePanel({ usage }: { usage: AdminAiUsage }) {
  const kinds = Object.entries(usage.byKind);
  return (
    <Section title="AI usage today" subtitle="Every model call is tracked as an event">
      <p className="font-mono text-lg font-semibold tabular-nums text-[#2E333B]">{usage.callsToday}</p>
      {kinds.length === 0 ? (
        <p className="text-[11px] text-[#2E333B]/60">No AI calls today.</p>
      ) : (
        <ul className="mt-1 space-y-0.5 text-[11px] text-[#2E333B]/80">
          {kinds.map(([kind, count]) => (
            <li key={kind} className="flex justify-between gap-3">
              <span className="font-mono">{kind}</span>
              <span className="font-mono tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
