import { Suspense, lazy, useEffect, useState, type FormEvent } from "react";
import { Button, Chip, Input, Select, SimulatedBadge } from "../../design";
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
import type { AdminAiUsage, CreateAmbassadorInput } from "./api";
import type { PacingChartPoint } from "./PacingChart";
import { COMPACT_BUTTON, DataTable, Section, StatusText } from "./parts";

const PacingChart = lazy(() => import("./PacingChart"));

const DECIDE_BASE =
  "inline-flex min-h-9 items-center justify-center rounded-control border px-3 text-[12px] " +
  "font-medium transition-colors duration-[var(--dur-ui)] disabled:cursor-not-allowed " +
  "disabled:opacity-40 pointer-coarse:min-h-11 focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-signal";
const APPROVE_BUTTON = `${DECIDE_BASE} border-hairline bg-surface-2 text-ink hover:border-hairline-strong hover:bg-surface-3`;
const REJECT_BUTTON = `${DECIDE_BASE} border-danger/40 bg-transparent text-danger hover:border-danger/60 hover:bg-danger/10`;

/* --------------------------------- headline --------------------------------- */

export function StatRuler({ overview }: { overview: AdminOverview }) {
  const pct =
    overview.target > 0
      ? Math.min(100, Math.round((overview.registrations / overview.target) * 100))
      : 0;
  const stats = [
    {
      label: "Registrations",
      value: String(overview.registrations),
      detail: `of ${overview.target} · ${pct}%`,
      progress: pct,
    },
    { label: "Today", value: String(overview.todayRegistrations), detail: "new today" },
    { label: "From referrals", value: `${overview.referralSharePct}%`, detail: "of registrations" },
    { label: "Colleges", value: String(overview.colleges), detail: "with registrations" },
    { label: "Qualified", value: String(overview.qualifiedReferrals), detail: "checked in" },
  ];
  return (
    <section
      data-testid="admin-overview"
      aria-label="Campaign headline numbers"
      className="border-b border-hairline"
    >
      <dl className="mx-auto grid max-w-[1120px] grid-cols-2 px-4 sm:px-6 md:grid-cols-5">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`border-b border-hairline py-3 max-md:odd:border-r max-md:odd:pr-4 max-md:even:pl-4 md:border-b-0 md:border-l md:py-4 md:pl-6 md:first:border-l-0 md:first:pl-0 ${
              index === stats.length - 1
                ? "max-md:col-span-2 max-md:border-b-0 max-md:pl-0"
                : ""
            }`}
          >
            <dt className="text-[11px] text-ink-subtle">{stat.label}</dt>
            <dd className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-[clamp(1.35rem,3vw,1.75rem)] font-medium leading-none tracking-[-0.01em] text-ink tabular-nums">
                {stat.value}
              </span>
              <span className="truncate text-[11px] text-ink-subtle">{stat.detail}</span>
            </dd>
            {stat.progress !== undefined ? (
              <div className="mt-2 h-px w-full max-w-[140px] bg-hairline" role="presentation">
                <div className="h-px bg-signal" style={{ width: `${stat.progress}%` }} />
              </div>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}

/* --------------------------------- simulated -------------------------------- */

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
    <div className="border-b border-warning/25 bg-warning/[0.07]">
      <div className="mx-auto grid max-w-[1120px] grid-cols-[auto_auto] items-center gap-x-3 gap-y-1 px-4 py-2 sm:flex sm:px-6 sm:py-1.5">
        <SimulatedBadge className="shrink-0" />
        <Chip
          selected={overview.includeSimulated}
          disabled={refreshing}
          onClick={() => onToggle(!overview.includeSimulated)}
          className="shrink-0 justify-self-end sm:order-3 sm:justify-self-auto"
        >
          Include simulated
        </Chip>
        <p className="col-span-2 min-w-0 text-[12px] leading-snug text-ink-muted sm:order-2 sm:col-span-1 sm:flex-1 sm:truncate">
          <span className="font-mono tabular-nums">{overview.simulatedCount}</span> simulated
          registrations in the database · this view{" "}
          {overview.includeSimulated ? "includes" : "excludes"} them
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------- pacing --------------------------------- */

export function PacingPanel({
  pacing,
  includeSimulated,
  onEnableSimulated,
  className = "",
}: {
  pacing: PacingResponse;
  includeSimulated: boolean;
  onEnableSimulated: () => void;
  className?: string;
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
  const replaying = replayDay !== null && replayDay < total;

  return (
    <Section
      title="Pacing vs plan"
      className={className}
      meta={
        <>
          day{" "}
          <span className="text-ink">{pacing.currentDay > 0 ? pacing.currentDay : "—"}</span> of{" "}
          {total} · projected day-7{" "}
          <span className="text-ink">{pacing.projectedTotal.toLocaleString("en-IN")}</span>
          {includeSimulated ? (
            <SimulatedBadge className="ml-2 align-middle font-sans" />
          ) : null}
        </>
      }
      aside={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-subtle">
            <span aria-hidden="true" className="h-px w-4 bg-hairline-strong" />
            planned
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-subtle">
            <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-signal" />
            actual
          </span>
          <button
            type="button"
            className={COMPACT_BUTTON}
            disabled={replaying}
            onClick={startReplay}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 12 12"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            >
              <path d="M3.5 2.5 9 6l-5.5 3.5z" strokeLinejoin="round" />
            </svg>
            {replayDay !== null ? `day ${Math.min(replayDay, total)}/${total}` : "Replay 7 days"}
          </button>
        </div>
      }
    >
      <div className="rounded-panel border border-hairline bg-surface-1 p-2 sm:p-3">
        <Suspense
          fallback={
            <div className="h-52 w-full animate-skeleton rounded bg-surface-2 sm:h-64" aria-hidden="true" />
          }
        >
          <PacingChart points={chartPoints} currentDay={pacing.currentDay} />
        </Suspense>
        {replayDay !== null ? (
          <div className="mt-1 h-px bg-hairline" role="presentation">
            <div
              className="h-px bg-signal transition-[width] duration-[2800ms] ease-linear"
              style={{ width: `${(Math.min(replayDay, total) / total) * 100}%` }}
            />
          </div>
        ) : null}
      </div>
    </Section>
  );
}

/* ----------------------------------- funnel --------------------------------- */

export function FunnelPanel({ steps, className = "" }: { steps: FunnelStep[]; className?: string }) {
  const max = Math.max(1, ...steps.map((step) => step.count));
  return (
    <Section
      title="Funnel"
      className={className}
      meta="landing view → referral registration"
    >
      <ol>
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={`py-2.5 ${index > 0 ? "border-t border-hairline" : ""}`}
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 truncate text-[13px] text-ink-muted">{step.label}</span>
              <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink">
                {step.count.toLocaleString("en-IN")}
                {step.conversionFromPrev !== null ? (
                  <span className="ml-2 text-[11px] text-ink-subtle">
                    {step.conversionFromPrev}%
                  </span>
                ) : null}
              </span>
            </div>
            <div className="mt-2 h-px w-full bg-hairline" role="presentation">
              <div
                className="h-px bg-signal"
                style={{
                  width: `${Math.max(step.count > 0 ? 0.5 : 0, (step.count / max) * 100)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ---------------------------------- channels -------------------------------- */

export function ChannelsPanel({ rows, className = "" }: { rows: ChannelRow[]; className?: string }) {
  return (
    <Section title="Channels" className={className} meta="referral vs UTM source">
      <DataTable
        columns={[
          { key: "channel", label: "Channel" },
          { key: "registrations", label: "Registrations", numeric: true },
          { key: "share", label: "Share", numeric: true },
        ]}
        rows={rows}
        rowKey={(row) => row.channel}
        empty="No registrations yet."
        cell={(row, column) => {
          if (column.key === "channel") {
            return (
              <span className="block">
                <span className="block text-ink">{row.channel}</span>
                <span className="mt-1.5 block h-px w-full max-w-[160px] bg-hairline">
                  <span
                    className="block h-px bg-signal"
                    style={{ width: `${Math.min(100, row.sharePct)}%` }}
                  />
                </span>
              </span>
            );
          }
          if (column.key === "registrations") return row.registrations.toLocaleString("en-IN");
          return `${row.sharePct}%`;
        }}
      />
    </Section>
  );
}

/* ---------------------------------- colleges -------------------------------- */

export function CollegesPanel({
  rows,
  className = "",
}: {
  rows: AdminCollegeRow[];
  className?: string;
}) {
  return (
    <Section
      title="Colleges"
      className={className}
      meta="no-ambassador rows are day-3 checkpoint targets"
    >
      <DataTable
        columns={[
          { key: "college", label: "College" },
          { key: "registrations", label: "Registrations", numeric: true },
          { key: "qualified", label: "Qualified", numeric: true },
          { key: "ambassadors", label: "Ambassadors", numeric: true },
          { key: "status", label: "Ambassador status" },
        ]}
        rows={rows}
        rowKey={(row) => `${row.collegeId ?? "other"}:${row.name}`}
        empty="No colleges yet."
        cell={(row, column) => {
          if (column.key === "college") {
            return (
              <>
                <span className="font-medium text-ink">{row.shortName}</span>
                {row.collegeId === null ? (
                  <span className="ml-1.5 text-[11px] text-ink-subtle">other</span>
                ) : null}
              </>
            );
          }
          if (column.key === "registrations") return row.registrations.toLocaleString("en-IN");
          if (column.key === "qualified") return row.qualified.toLocaleString("en-IN");
          if (column.key === "ambassadors") return row.ambassadors.toLocaleString("en-IN");
          return row.hasAmbassador ? (
            <span className="text-[12px] text-success">covered</span>
          ) : (
            <StatusText tone="open">No ambassador yet</StatusText>
          );
        }}
      />
    </Section>
  );
}

/* ---------------------------------- variants -------------------------------- */

export function VariantsPanel({ rows, className = "" }: { rows: VariantRow[]; className?: string }) {
  return (
    <Section title="Share variants" className={className} meta="per WhatsApp message">
      <DataTable
        columns={[
          { key: "variant", label: "Variant" },
          { key: "landings", label: "Landings", numeric: true },
          { key: "registrations", label: "Registrations", numeric: true },
          { key: "conversion", label: "Conversion", numeric: true },
        ]}
        rows={rows}
        rowKey={(row) => row.variant}
        empty="No variant traffic yet."
        cell={(row, column) => {
          if (column.key === "variant") return <span className="font-mono">{row.variant}</span>;
          if (column.key === "landings") return row.landings.toLocaleString("en-IN");
          if (column.key === "registrations") return row.registrations.toLocaleString("en-IN");
          return `${row.conversionPct}%`;
        }}
      />
    </Section>
  );
}

/* ----------------------------------- flags ---------------------------------- */

export function FlagsPanel({
  rows,
  busyId,
  onDecide,
  className = "",
}: {
  rows: FlagRow[];
  busyId: string | null;
  onDecide: (userId: string, decision: "approve" | "reject") => void;
  className?: string;
}) {
  const open = rows.filter((row) => row.status === "open").length;
  return (
    <Section
      title="Flags queue"
      className={className}
      testId="flags-queue"
      meta={`${open} open · ${rows.length} total`}
    >
      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "contact", label: "Contact", className: "md:max-w-[15rem]" },
          { key: "reason", label: "Reason" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Decision" },
        ]}
        rows={rows}
        rowKey={(row) => row.userId}
        empty="No flags."
        cell={(row, column) => {
          if (column.key === "name") return row.name;
          if (column.key === "contact") {
            return (
              <span className="block">
                <span className="block break-all">{row.email}</span>
                <span className="block font-mono text-[11px] text-ink-subtle">{row.phone}</span>
              </span>
            );
          }
          if (column.key === "reason") {
            return <span className="font-mono text-[12px] text-ink-muted">{row.reason}</span>;
          }
          if (column.key === "status") {
            const tone =
              row.status === "open" ? "open" : row.status === "approved" ? "good" : "bad";
            return <StatusText tone={tone}>{row.status}</StatusText>;
          }
          const busy = busyId === row.userId;
          return (
            <span className="flex justify-end gap-2 md:justify-start">
              <button
                type="button"
                disabled={busy || row.status !== "open"}
                onClick={() => onDecide(row.userId, "approve")}
                className={APPROVE_BUTTON}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy || row.status !== "open"}
                onClick={() => onDecide(row.userId, "reject")}
                className={REJECT_BUTTON}
              >
                Reject
              </button>
            </span>
          );
        }}
      />
    </Section>
  );
}

/* --------------------------------- ambassadors ------------------------------ */

export function AmbassadorsPanel({
  rows,
  colleges,
  onCreate,
  className = "",
}: {
  rows: AdminAmbassadorRow[];
  colleges: AdminCollegeRow[];
  onCreate: (input: CreateAmbassadorInput) => Promise<void>;
  className?: string;
}) {
  const collegeOptions = colleges
    .filter((college) => college.collegeId !== null)
    .map((college) => ({ value: college.collegeId ?? "", label: college.name }));
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
    <Section
      title="Ambassadors"
      className={className}
      meta={`${rows.length} active · registrations and qualified referrals they drove`}
    >
      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "college", label: "College" },
          { key: "code", label: "Code" },
          { key: "registrations", label: "Registrations", numeric: true },
          { key: "qualified", label: "Qualified", numeric: true },
          { key: "activity", label: "Last activity" },
        ]}
        rows={rows}
        rowKey={(row) => row.userId}
        empty="No ambassadors yet."
        cell={(row, column) => {
          if (column.key === "name") return row.name;
          if (column.key === "college") return row.college ?? "—";
          if (column.key === "code") {
            return (
              <a
                className="font-mono text-info underline decoration-hairline-strong underline-offset-4 hover:decoration-current"
                href={row.kitPath}
                target="_blank"
                rel="noreferrer"
              >
                {row.code}
              </a>
            );
          }
          if (column.key === "registrations") return row.registrations.toLocaleString("en-IN");
          if (column.key === "qualified") return row.qualified.toLocaleString("en-IN");
          return row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleString() : "—";
        }}
      />

      <form
        onSubmit={handleSubmit}
        className="mt-5 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-hairline pt-5 sm:grid-cols-2 lg:grid-cols-5"
      >
        <Input
          label="Name"
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Select
          label="College"
          value={collegeChoice}
          onChange={(event) => setCollegeChoice(event.target.value)}
          options={[...collegeOptions, { value: "__other", label: "Other…" }]}
          placeholder="No college"
        />
        {collegeChoice === "__other" ? (
          <Input
            label="College name"
            value={collegeOther}
            onChange={(event) => setCollegeOther(event.target.value)}
          />
        ) : null}
        <Input
          label="Phone (optional)"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          spellCheck={false}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <Input
          label="Email (optional)"
          type="email"
          autoComplete="off"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div className="flex items-end">
          <Button type="submit" variant="primary" loading={saving} className="w-full sm:w-auto">
            Create ambassador
          </Button>
        </div>
      </form>
      {error ? (
        <p className="mt-3 text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </Section>
  );
}

/* ----------------------------------- brief ---------------------------------- */

export function BriefPanel({
  brief,
  loading,
  onGenerate,
  className = "",
}: {
  brief: DailyBrief | null;
  loading: boolean;
  onGenerate: () => void;
  className?: string;
}) {
  return (
    <Section
      title="Daily brief"
      className={className}
      meta={brief ? `generated ${new Date(brief.generatedAt).toLocaleString()}` : "not generated yet"}
      aside={
        <Button variant="secondary" loading={loading} onClick={onGenerate}>
          {loading ? "Generating…" : "Generate brief"}
        </Button>
      }
    >
      {brief === null && !loading ? (
        <p className="text-[13px] text-ink-subtle">
          No brief generated yet. Generate one for rule-based recommendations and an optional AI
          paragraph.
        </p>
      ) : null}
      {brief ? (
        <div>
          <ol>
            {brief.lines.map((line, index) => (
              <li
                key={line}
                className={`py-2.5 text-[13px] leading-relaxed text-ink-muted ${
                  index > 0 ? "border-t border-hairline" : ""
                }`}
              >
                {line}
              </li>
            ))}
          </ol>
          {brief.aiParagraph ? (
            <div className="mt-4 border-l border-hairline-strong pl-3">
              <p className="font-mono text-[11px] text-ink-subtle">AI summary</p>
              <p className="mt-1.5 max-w-[75ch] text-[13px] leading-relaxed text-ink-muted">
                {brief.aiParagraph}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[12px] text-ink-subtle">
              AI summary unavailable — rule-based lines only.
            </p>
          )}
        </div>
      ) : null}
    </Section>
  );
}

/* ----------------------------------- export --------------------------------- */

export function ExportPanel({
  includeSimulated,
  onExport,
  className = "",
}: {
  includeSimulated: boolean;
  onExport: (include: boolean) => Promise<void>;
  className?: string;
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
    <Section title="Export" className={className} meta="admin-only CSV">
      <Button variant="secondary" loading={busy} onClick={handleClick}>
        {busy ? "Preparing…" : "Download registrations CSV"}
      </Button>
      <p className="mt-3 max-w-[60ch] text-[12px] leading-relaxed text-ink-subtle">
        Name, email, phone, college, branch, UTM, referral and check-in status —{" "}
        {includeSimulated ? "simulated rows included." : "simulated rows excluded."}
      </p>
      {error ? (
        <p className="mt-2 text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </Section>
  );
}

/* ---------------------------------- ai usage -------------------------------- */

export function AiUsagePanel({ usage, className = "" }: { usage: AdminAiUsage; className?: string }) {  const kinds = Object.entries(usage.byKind);
  return (
    <Section title="AI usage today" className={className} meta="every model call is an event">
      <p className="font-mono text-[1.75rem] font-medium leading-none tabular-nums text-ink">
        {usage.callsToday.toLocaleString("en-IN")}
      </p>
      {kinds.length === 0 ? (
        <p className="mt-2 text-[12px] text-ink-subtle">No AI calls today.</p>
      ) : (
        <ul className="mt-3">
          {kinds.map(([kind, count], index) => (
            <li
              key={kind}
              className={`flex justify-between gap-3 py-2 text-[12px] ${
                index > 0 ? "border-t border-hairline" : ""
              }`}
            >
              <span className="font-mono text-ink-muted">{kind}</span>
              <span className="font-mono tabular-nums text-ink">
                {count.toLocaleString("en-IN")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
