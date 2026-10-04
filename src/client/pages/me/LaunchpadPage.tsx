/**
 * WS4 — My Launchpad (PRD §4.2 M3): ticket, share buttons, tiers, ranks,
 * referrals, calendar. Mobile-first; works in WhatsApp/Instagram in-app browsers.
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { REWARD_TIERS, WHATSAPP_VARIANTS } from "../../../shared/constants";
import type { MeResponse } from "../../../shared/contracts";
import { trackEvent } from "./events";
import {
  WHATSAPP_VARIANT_LABELS,
  googleCalendarUrl,
  linkedinShareUrl,
  storyImagePath,
  whatsappShareUrl,
  type ShareContext,
} from "./share";
import { cx, formatIst } from "./format";
import {
  CopyButton,
  Countdown,
  ErrorState,
  LoadingState,
  PageShell,
  Panel,
  SectionTitle,
  SimulatedBadge,
  StatusBadge,
} from "./ui";

type LoadState =
  | { status: "loading" }
  | { status: "error"; notFound: boolean }
  | { status: "ready"; data: MeResponse };

export default function LaunchpadPage() {
  const [params] = useSearchParams();
  const token = params.get("t");
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const url = token ? `/api/me?t=${encodeURIComponent(token)}` : "/api/me";
    fetch(url, {
      credentials: "include",
      signal: controller.signal,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw Object.assign(new Error("me request failed"), {
            notFound: response.status === 401 || response.status === 404,
          });
        }
        return (await response.json()) as MeResponse;
      })
      .then((data) => setState({ status: "ready", data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const notFound = Boolean(
          error && typeof error === "object" && "notFound" in error && error.notFound,
        );
        setState({ status: "error", notFound });
      });
    return () => controller.abort();
  }, [token]);

  if (state.status === "loading") {
    return (
      <PageShell title="My Launchpad">
        <LoadingState label="Loading your launchpad" />
      </PageShell>
    );
  }

  if (state.status === "error") {
    return (
      <PageShell title="My Launchpad">
        <ErrorState
          title={state.notFound ? "We couldn't find your Launchpad" : "Something went wrong"}
          message={
            state.notFound
              ? "Open the link we showed you after registration, or register again — it takes 30 seconds."
              : "We could not load your page just now. Check your connection and try again."
          }
          action={
            <Link
              to="/"
              className="inline-flex min-h-11 items-center rounded-md bg-[#1F3A93] px-4 text-sm font-bold text-white"
            >
              Go to registration
            </Link>
          }
        />
      </PageShell>
    );
  }

  return <Launchpad data={state.data} />;
}

function Launchpad({ data }: { data: MeResponse }) {
  const { user, idea, stats, ranks } = data;
  const shareContext: ShareContext = {
    project: idea?.title ?? null,
    link: data.referralLink,
    collegeShort: user.college?.shortName ?? user.collegeOther,
    collegeRank: ranks.college?.rank ?? null,
  };

  const total = stats.totalReferrals;
  const nextAt = stats.nextTierAt;
  const progress = nextAt && nextAt > 0 ? Math.min(100, Math.round((total / nextAt) * 100)) : 100;

  const calendarHref =
    data.calendar.googleUrl ||
    googleCalendarUrl({
      title: "Build Your First AI Project in 60 Minutes — NxtWave",
      details: `Ship60 workshop. Your seat: #${user.seatNo}. Launchpad: ${data.referralLandingPath}`,
      startIso: data.workshop.startIso,
      durationMinutes: 90,
    });

  function shareClicked(variant: string) {
    trackEvent("share_clicked", { variant, surface: "launchpad" });
  }

  return (
    <PageShell
      title="My Launchpad"
      subtitle="Your seat, your link, and everyone who joins through you."
    >
      <Panel className="border-l-4 border-l-[#D7263D]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-wide text-[#1F3A93]">
              {data.checkedIn ? "Checked in" : "Your seat is saved"}
            </p>
            <p className="mt-1 text-3xl font-bold text-[#1F3A93]">Seat #{user.seatNo}</p>
            <p className="mt-1 text-sm">
              {user.firstName}
              {user.college?.shortName
                ? ` · ${user.college.shortName}`
                : user.collegeOther
                  ? ` · ${user.collegeOther}`
                  : ""}
            </p>
          </div>
          {user.isSimulated ? <SimulatedBadge /> : null}
        </div>
        <div className="mt-3 rounded-md bg-[#FFE45C] px-3 py-2">
          <p className="text-xs font-bold text-[#2E333B]">Your project</p>
          <p className="text-lg font-bold leading-snug text-[#1F3A93]">
            {idea?.title ?? "Your first AI project"}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>{formatIst(data.workshop.startIso)} IST</span>
          <Countdown targetIso={data.workshop.startIso} />
        </div>
      </Panel>

      <Panel className="mt-4">
        <SectionTitle>Your referral link</SectionTitle>
        <div className="flex items-stretch gap-2">
          <input
            readOnly
            aria-label="Your referral link"
            value={data.referralLink}
            className="min-h-11 w-full min-w-0 rounded-md border border-[#DDE5F2] bg-[#FBFCFE] px-3 text-sm"
          />
          <CopyButton
            text={data.referralLink}
            label="Copy my link"
            className="shrink-0"
            onCopied={() => shareClicked("copy")}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {WHATSAPP_VARIANTS.map((variant) => (
            <a
              key={variant}
              href={whatsappShareUrl(variant, shareContext)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => shareClicked(variant)}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#1F3A93] px-4 text-sm font-bold text-white"
            >
              Share on WhatsApp · {WHATSAPP_VARIANT_LABELS[variant]}
            </a>
          ))}
          <a
            href={linkedinShareUrl(data.referralLink)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => shareClicked("linkedin")}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#1F3A93] px-4 text-sm font-bold text-[#1F3A93]"
          >
            Share on LinkedIn
          </a>
          <a
            href={storyImagePath(user.refCode)}
            download={`ship60-${user.refCode}-story.png`}
            onClick={() => shareClicked("story")}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#DDE5F2] px-4 text-sm font-bold text-[#2E333B]"
          >
            Download story image for Instagram
          </a>
        </div>
      </Panel>

      <Panel className="mt-4">
        <SectionTitle>Reward progress</SectionTitle>
        <p className="text-sm">
          <span className="text-2xl font-bold text-[#1F3A93]">{total}</span>{" "}
          {total === 1 ? "person joined" : "people joined"} through you ·{" "}
          {stats.qualifiedReferrals} checked in
        </p>
        <div
          className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[#DDE5F2]"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress to the next reward"
        >
          <div className="h-full bg-[#1F3A93]" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm">
          {nextAt && stats.nextTierLabel
            ? `${Math.max(0, nextAt - total)} more to unlock: ${stats.nextTierLabel}`
            : "Every reward tier unlocked. Top referrers win cash prizes after the workshop."}
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {REWARD_TIERS.map((tier, index) => (
            <li key={tier.label} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cx(
                  "inline-block h-3 w-3 rounded-full border border-[#1F3A93]",
                  index <= stats.tierIndex ? "bg-[#1F3A93]" : "bg-white",
                )}
              />
              <span className={index <= stats.tierIndex ? "font-bold" : ""}>
                {tier.label} · {tier.minReferrals}
                {tier.on === "qualified" ? " check-ins" : " referrals"}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Panel>
          <p className="text-xs font-bold text-[#2E333B]">Your rank</p>
          <p className="mt-1 text-2xl font-bold text-[#1F3A93]">
            {ranks.student ? `#${ranks.student}` : "—"}
          </p>
          <p className="text-xs">among students</p>
        </Panel>
        <Panel>
          <p className="text-xs font-bold text-[#2E333B]">College rank</p>
          <p className="mt-1 text-2xl font-bold text-[#1F3A93]">
            {ranks.college ? `#${ranks.college.rank}` : "—"}
          </p>
          <p className="truncate text-xs">{ranks.college?.name ?? "Not ranked yet"}</p>
        </Panel>
      </div>

      <Panel className="mt-4">
        <SectionTitle>People you brought in</SectionTitle>
        {data.referrals.length === 0 ? (
          <p className="text-sm">
            No one yet. Drop your link in one class group — that is how most seats fill.
          </p>
        ) : (
          <ul className="divide-y divide-[#DDE5F2]">
            {data.referrals.map((referral) => (
              <li key={`${referral.firstName}-${referral.createdAt}`} className="flex items-center justify-between gap-2 py-2">
                <span className="text-sm font-bold">{referral.firstName}</span>
                <StatusBadge status={referral.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="mt-4">
        <SectionTitle>Add the workshop to your calendar</SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a
            href={data.calendar.icsPath}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#1F3A93] px-4 text-sm font-bold text-[#1F3A93]"
          >
            Download .ics
          </a>
          <a
            href={calendarHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#1F3A93] px-4 text-sm font-bold text-[#1F3A93]"
          >
            Google Calendar
          </a>
        </div>
      </Panel>

      <p className="mt-6 text-center text-sm">
        <Link className="font-bold text-[#1F3A93] underline" to="/leaderboard">
          See the leaderboard
        </Link>
      </p>
    </PageShell>
  );
}
