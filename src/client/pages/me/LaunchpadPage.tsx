/**
 * WS4 — My Launchpad (PRD §4.2 M3): ticket first, then share actions, reward
 * tiers as a hairline list, ranks as mono stats, referrals as rows, calendar.
 * Flight Deck restyle (DESIGN.md §8); fetch and share behavior unchanged.
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { REWARD_TIERS, WHATSAPP_VARIANTS } from "../../../shared/constants";
import type { MeResponse } from "../../../shared/contracts";
import { SimulatedBadge, Stat, Ticket, buttonClass } from "../../design";
import { trackEvent } from "./events";
import {
  WHATSAPP_VARIANT_LABELS,
  googleCalendarUrl,
  linkedinShareUrl,
  storyImagePath,
  whatsappShareUrl,
  type ShareContext,
} from "./share";
import { saveStoryImage } from "./story";
import { formatIst } from "./format";
import {
  CopyButton,
  CountdownLabel,
  ErrorState,
  LoadingState,
  PageShell,
  Panel,
  SectionTitle,
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
            <Link to="/" className={buttonClass({ variant: "primary" })}>
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
  const collegeName = user.college?.shortName ?? user.collegeOther;

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
      <Ticket
        seatNo={user.seatNo}
        name={`${user.firstName}${collegeName ? ` · ${collegeName}` : ""}`}
        projectTitle={idea?.title ?? "Your first AI project"}
        detail={`${data.checkedIn ? "Checked in" : "Seat saved"} · ${formatIst(data.workshop.startIso)} IST`}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CountdownLabel targetIso={data.workshop.startIso} />
            {user.isSimulated ? <SimulatedBadge /> : null}
          </div>
        }
      />

      <Panel className="mt-4">
        <SectionTitle>Your referral link</SectionTitle>
        <p className="break-all rounded-control border border-hairline bg-surface-2 px-3 py-2.5 font-mono text-label leading-relaxed text-ink">
          {data.referralLink}
        </p>
        <CopyButton
          text={data.referralLink}
          label="Copy my link"
          variant="primary"
          className="mt-3 w-full"
          testId="copy-link"
          onCopied={() => shareClicked("copy")}
        />
        <div className="mt-4 space-y-2">
          {WHATSAPP_VARIANTS.map((variant) => (
            <a
              key={variant}
              href={whatsappShareUrl(variant, shareContext)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => shareClicked(variant)}
              className={buttonClass({ variant: "secondary", fullWidth: true })}
            >
              Share on WhatsApp · {WHATSAPP_VARIANT_LABELS[variant]}
            </a>
          ))}
          <a
            href={linkedinShareUrl(data.referralLink)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => shareClicked("linkedin")}
            className={buttonClass({ variant: "secondary", fullWidth: true })}
          >
            Share on LinkedIn
          </a>
          <a
            href={storyImagePath(user.refCode)}
            download={`ship60-${user.refCode}-story.png`}
            onClick={(event) => {
              event.preventDefault();
              shareClicked("story");
              void saveStoryImage(user.refCode, `ship60-${user.refCode}-story.png`);
            }}
            className={buttonClass({ variant: "secondary", fullWidth: true })}
          >
            Download story image for Instagram
          </a>
          <p className="text-label text-ink-subtle">Long-press the image to save it.</p>
        </div>
      </Panel>

      <Panel className="mt-4">
        <SectionTitle>Reward progress</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Stat value={total} label="joined through you" />
          <Stat value={stats.qualifiedReferrals} label="checked in" />
        </div>
        <div
          className="mt-5"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress to the next reward"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-label text-ink-subtle">
              {nextAt && stats.nextTierLabel ? "Next reward" : "All rewards unlocked"}
            </span>
            <span className="font-mono text-mono-data text-ink tabular-nums">{progress}%</span>
          </div>
          <div className="mt-2 h-0.5 w-full bg-surface-3">
            <div className="h-0.5 bg-ink-muted" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <p className="mt-3 text-body-sm leading-relaxed text-ink-muted">
          {nextAt && stats.nextTierLabel
            ? `${Math.max(0, nextAt - total)} more to unlock: ${stats.nextTierLabel}`
            : "Every reward tier unlocked. Top referrers win cash prizes after the workshop."}
        </p>
        <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
          {REWARD_TIERS.map((tier, index) => {
            const current = tier.on === "qualified" ? stats.qualifiedReferrals : total;
            const unlocked = index < stats.tierIndex;
            return (
              <li
                key={tier.label}
                className="flex items-baseline justify-between gap-3 py-3"
              >
                <span className="min-w-0 text-body-sm leading-snug text-ink-muted">
                  {tier.label}
                  <span className="mt-0.5 block font-mono text-label text-ink-subtle">
                    {tier.minReferrals}{" "}
                    {tier.on === "qualified"
                      ? "check-ins"
                      : tier.minReferrals === 1
                        ? "referral"
                        : "referrals"}
                  </span>
                </span>
                {unlocked ? (
                  <span className="shrink-0 text-label font-medium text-success">Unlocked</span>
                ) : (
                  <span className="shrink-0 font-mono text-mono-data text-ink tabular-nums">
                    {current}/{tier.minReferrals}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="mt-4 grid grid-cols-2 divide-x divide-hairline border-y border-hairline">
        <div className="min-w-0 py-4 pr-4">
          <Stat
            value={ranks.student ? `#${ranks.student}` : "—"}
            label="your rank among students"
          />
        </div>
        <div className="min-w-0 py-4 pl-4">
          <Stat
            value={ranks.college ? `#${ranks.college.rank}` : "—"}
            label={ranks.college?.name ?? "college rank"}
          />
        </div>
      </div>

      <Panel className="mt-4">
        <SectionTitle>People you brought in</SectionTitle>
        {data.referrals.length === 0 ? (
          <p className="text-body-sm leading-relaxed text-ink-muted">
            No one yet. Drop your link in one class group — that is how most seats fill.
          </p>
        ) : (
          <ul data-testid="referral-list" className="divide-y divide-hairline">
            {data.referrals.map((referral) => (
              <li
                key={`${referral.firstName}-${referral.createdAt}`}
                className="flex items-center justify-between gap-3 py-3"
              >
                <span className="min-w-0 truncate text-body-sm font-medium text-ink">
                  {referral.firstName}
                </span>
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
            className={buttonClass({ variant: "secondary", fullWidth: true })}
          >
            Download .ics
          </a>
          <a
            href={calendarHref}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: "secondary", fullWidth: true })}
          >
            Google Calendar
          </a>
        </div>
      </Panel>

      <p className="mt-8 text-center text-body-sm">
        <Link
          to="/leaderboard"
          className="rounded-sm text-ink-muted underline decoration-hairline-strong underline-offset-4 transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          See the leaderboard
        </Link>
      </p>
    </PageShell>
  );
}
