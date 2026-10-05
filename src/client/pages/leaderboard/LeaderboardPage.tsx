/**
 * WS4 — Leaderboards (PRD §4.2 M5): students and colleges tabs, header
 * countdown, hairline tables with mono tabular ranks, and the "Simulated data"
 * label whenever any returned row is simulated. Fetch behavior unchanged.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import type { LeaderboardResponse } from "../../../shared/contracts";
import { Chip, SimulatedBadge, buttonClass, cn } from "../../design";
import { CountdownLabel, ErrorState, LoadingState, PageShell } from "../me/ui";

type Tab = "students" | "colleges";

interface LoadState {
  tab: Tab;
  data: LeaderboardResponse | null;
  failed: boolean;
}

type FlaggedRow = { isSimulated?: unknown; is_simulated?: unknown };

function rowsContainSimulated(rows: FlaggedRow[]): boolean {
  return rows.some(
    (row) =>
      row.isSimulated === true || row.is_simulated === true || row.is_simulated === 1,
  );
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("students");
  const [state, setState] = useState<LoadState>({ tab: "students", data: null, failed: false });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/leaderboard?type=${tab}`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("leaderboard request failed");
        return (await response.json()) as LeaderboardResponse;
      })
      .then((data) => {
        if (!controller.signal.aborted) setState({ tab, data, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ tab, data: null, failed: true });
      });
    return () => controller.abort();
  }, [tab]);

  const active = state.tab === tab;
  const loading = !active || (!state.data && !state.failed);
  const failed = active && state.failed;
  const data = active ? state.data : null;
  const rows: FlaggedRow[] = (
    data ? (tab === "students" ? (data.students ?? []) : (data.colleges ?? [])) : []
  ) as FlaggedRow[];
  const simulated = rowsContainSimulated(rows);

  return (
    <PageShell
      title="Leaderboard"
      subtitle="Qualified referrals decide the order. Check-in at the live workshop is what qualifies a referral."
      topRight={data ? <CountdownLabel targetIso={data.workshopStartIso} /> : undefined}
    >
      {data ? (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-y border-hairline py-3">
          <span className="text-body-sm text-ink-muted">
            {tab === "students" ? "Top 50 students" : "Colleges by qualified referrals"}
          </span>
          <span className="font-mono text-mono-data text-ink-subtle">
            {formatWorkshop(data.workshopStartIso)}
          </span>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Leaderboard type">
        {(["students", "colleges"] as const).map((value) => (
          <Chip key={value} selected={tab === value} onClick={() => setTab(value)}>
            {value === "students" ? "Students" : "Colleges"}
          </Chip>
        ))}
      </div>

      {simulated ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SimulatedBadge />
          <span className="text-label text-ink-muted">This board includes seeded demo rows.</span>
        </div>
      ) : null}

      {loading ? <LoadingState label="Loading leaderboard" /> : null}

      {failed ? (
        <ErrorState
          title="Could not load the leaderboard"
          message="The board is taking a break. Try again in a minute."
          action={
            <Link to="/me" className={buttonClass({ variant: "primary" })}>
              Back to my Launchpad
            </Link>
          }
        />
      ) : null}

      {data && tab === "students" ? (
        <Board>
          {(data.students ?? []).length === 0 ? (
            <p className="p-4 text-body-sm text-ink-muted">
              No referrals yet. The first check-ins will appear here.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-hairline md:hidden">
                {(data.students ?? []).map((row) => (
                  <li key={`${row.rank}-${row.displayName}`} className="px-4 py-3">
                    <div className="flex items-baseline gap-3">
                      <span className="w-7 shrink-0 font-mono text-mono-data text-ink-subtle tabular-nums">
                        {row.rank}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink">
                        {row.displayName}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate pl-10 text-label text-ink-subtle">
                      {row.collegeShort}
                    </p>
                    <dl className="mt-2 space-y-1 border-t border-hairline pt-2 pl-10">
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-label text-ink-subtle">Qualified</dt>
                        <dd className="font-mono text-mono-data text-ink tabular-nums">
                          {row.qualified}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-label text-ink-subtle">Total referrals</dt>
                        <dd className="font-mono text-mono-data text-ink-muted tabular-nums">
                          {row.total}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              <table className="hidden w-full border-collapse text-left md:table">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="px-4 py-2.5 text-label font-medium text-ink-subtle">#</th>
                    <th className="px-4 py-2.5 text-label font-medium text-ink-subtle">Student</th>
                    <th className="px-4 py-2.5 text-right text-label font-medium text-ink-subtle">
                      Qualified
                    </th>
                    <th className="px-4 py-2.5 text-right text-label font-medium text-ink-subtle">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data.students ?? []).map((row) => (
                    <tr
                      key={`${row.rank}-${row.displayName}`}
                      className="border-b border-hairline last:border-b-0"
                    >
                      <td className="px-4 py-2.5 font-mono text-mono-data text-ink-muted tabular-nums">
                        {row.rank}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-body-sm font-medium text-ink">
                          {row.displayName}
                        </span>
                        <span className="block text-label text-ink-subtle">{row.collegeShort}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-mono-data text-ink tabular-nums">
                        {row.qualified}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-mono-data text-ink-muted tabular-nums">
                        {row.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Board>
      ) : null}

      {data && tab === "colleges" ? (
        <Board>
          {(data.colleges ?? []).length === 0 ? (
            <p className="p-4 text-body-sm text-ink-muted">No college rows yet.</p>
          ) : (
            <>
              <ul className="divide-y divide-hairline md:hidden">
                {(data.colleges ?? []).map((row) => (
                  <li key={`${row.rank}-${row.collegeId}`} className="px-4 py-3">
                    <div className="flex items-baseline gap-3">
                      <span className="w-7 shrink-0 font-mono text-mono-data text-ink-subtle tabular-nums">
                        {row.rank}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-ink">
                        {row.shortName || row.name}
                      </span>
                    </div>
                    <dl className="mt-2 space-y-1 border-t border-hairline pt-2 pl-10">
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-label text-ink-subtle">Registrations</dt>
                        <dd className="font-mono text-mono-data text-ink tabular-nums">
                          {row.registrations}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-label text-ink-subtle">Qualified</dt>
                        <dd className="font-mono text-mono-data text-ink tabular-nums">
                          {row.qualified}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-label text-ink-subtle">Ambassadors</dt>
                        <dd className="font-mono text-mono-data text-ink-muted tabular-nums">
                          {row.ambassadors}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              <table className="hidden w-full border-collapse text-left md:table">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="px-4 py-2.5 text-label font-medium text-ink-subtle">#</th>
                    <th className="px-4 py-2.5 text-label font-medium text-ink-subtle">College</th>
                    <th className="px-4 py-2.5 text-right text-label font-medium text-ink-subtle">
                      Regs
                    </th>
                    <th className="px-4 py-2.5 text-right text-label font-medium text-ink-subtle">
                      Qualified
                    </th>
                    <th className="px-4 py-2.5 text-right text-label font-medium text-ink-subtle">
                      Amb.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data.colleges ?? []).map((row) => (
                    <tr
                      key={`${row.rank}-${row.collegeId}`}
                      className="border-b border-hairline last:border-b-0"
                    >
                      <td className="px-4 py-2.5 font-mono text-mono-data text-ink-muted tabular-nums">
                        {row.rank}
                      </td>
                      <td className="px-4 py-2.5 text-body-sm font-medium text-ink">
                        {row.shortName || row.name}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-mono-data text-ink tabular-nums">
                        {row.registrations}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-mono-data text-ink tabular-nums">
                        {row.qualified}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-mono-data text-ink-muted tabular-nums">
                        {row.ambassadors}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Board>
      ) : null}
    </PageShell>
  );
}

/** Hairline table frame; rows carry their own dividers. */
function Board({ children }: { children: ReactNode }) {
  return (
    <section className={cn("overflow-hidden rounded-panel border border-hairline bg-surface-1")}>
      {children}
    </section>
  );
}

function formatWorkshop(iso: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
