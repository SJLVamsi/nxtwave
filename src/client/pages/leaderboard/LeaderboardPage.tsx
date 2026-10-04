/**
 * WS4 — Leaderboards (PRD §4.2 M5): students and colleges tabs, countdown,
 * "Simulated data" label whenever any returned row is simulated.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { LeaderboardResponse } from "../../../shared/contracts";
import { cx } from "../me/format";
import {
  Countdown,
  ErrorState,
  LoadingState,
  PageShell,
  Panel,
  SimulatedBadge,
} from "../me/ui";

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
    >
      {data ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#DDE5F2] bg-white px-4 py-3">
          <span className="text-sm">
            {tab === "students" ? "Top 50 students" : "Colleges"} ·{" "}
            {formatWorkshop(data.workshopStartIso)}
          </span>
          <Countdown targetIso={data.workshopStartIso} />
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2" role="tablist" aria-label="Leaderboard type">
        {(["students", "colleges"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cx(
              "min-h-11 rounded-md border px-4 text-sm font-bold",
              tab === value
                ? "border-[#1F3A93] bg-[#1F3A93] text-white"
                : "border-[#DDE5F2] bg-white text-[#2E333B]",
            )}
          >
            {value === "students" ? "Students" : "Colleges"}
          </button>
        ))}
      </div>

      {simulated ? (
        <div className="mb-3 flex items-center gap-2">
          <SimulatedBadge />
          <span className="text-xs">This board includes seeded demo rows.</span>
        </div>
      ) : null}

      {loading ? <LoadingState label="Loading leaderboard" /> : null}

      {failed ? (
        <ErrorState
          title="Could not load the leaderboard"
          message="The board is taking a break. Try again in a minute."
          action={
            <Link to="/me" className="inline-flex min-h-11 items-center rounded-md bg-[#1F3A93] px-4 text-sm font-bold text-white">
              Back to my Launchpad
            </Link>
          }
        />
      ) : null}

      {data && tab === "students" ? (
        <Panel className="overflow-hidden p-0">
          {(data.students ?? []).length === 0 ? (
            <p className="p-4 text-sm">No referrals yet. The first check-ins will appear here.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#DDE5F2] text-left text-xs text-[#2E333B]">
                  <th className="px-3 py-2 font-bold">#</th>
                  <th className="px-3 py-2 font-bold">Student</th>
                  <th className="px-3 py-2 text-right font-bold">Qualified</th>
                  <th className="px-3 py-2 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {(data.students ?? []).map((row) => (
                  <tr key={`${row.rank}-${row.displayName}`} className="border-b border-[#DDE5F2] last:border-b-0">
                    <td className="px-3 py-2 font-bold text-[#1F3A93]">{row.rank}</td>
                    <td className="px-3 py-2">
                      <span className="font-bold">{row.displayName}</span>
                      <span className="block text-xs text-[#2E333B]">{row.collegeShort}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{row.qualified}</td>
                    <td className="px-3 py-2 text-right">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      ) : null}

      {data && tab === "colleges" ? (
        <Panel className="overflow-hidden p-0">
          {(data.colleges ?? []).length === 0 ? (
            <p className="p-4 text-sm">No college rows yet.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#DDE5F2] text-left text-xs text-[#2E333B]">
                  <th className="px-3 py-2 font-bold">#</th>
                  <th className="px-3 py-2 font-bold">College</th>
                  <th className="px-3 py-2 text-right font-bold">Regs</th>
                  <th className="px-3 py-2 text-right font-bold">Qualified</th>
                  <th className="px-3 py-2 text-right font-bold">Amb.</th>
                </tr>
              </thead>
              <tbody>
                {(data.colleges ?? []).map((row) => (
                  <tr key={`${row.rank}-${row.collegeId}`} className="border-b border-[#DDE5F2] last:border-b-0">
                    <td className="px-3 py-2 font-bold text-[#1F3A93]">{row.rank}</td>
                    <td className="px-3 py-2">
                      <span className="font-bold">{row.shortName || row.name}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{row.registrations}</td>
                    <td className="px-3 py-2 text-right">{row.qualified}</td>
                    <td className="px-3 py-2 text-right">{row.ambassadors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      ) : null}
    </PageShell>
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
