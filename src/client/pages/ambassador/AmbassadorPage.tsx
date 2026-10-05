/**
 * WS4 — Ambassador kit (PRD §4.2 M7): link, 3 message variants, story image,
 * posting window, stats, respectful-posting checklist.
 * Flight Deck restyle (DESIGN.md §8); behavior unchanged.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { WHATSAPP_VARIANTS } from "../../../shared/constants";
import type { AmbassadorKitResponse } from "../../../shared/contracts";
import { SimulatedBadge, Stat, buttonClass } from "../../design";
import { trackEvent } from "../me/events";
import {
  WHATSAPP_VARIANT_LABELS,
  storyImagePath,
  whatsappMessage,
  whatsappShareUrl,
  type ShareContext,
} from "../me/share";
import { saveStoryImage } from "../me/story";
import {
  CheckIcon,
  CopyButton,
  ErrorState,
  LoadingState,
  PageShell,
  Panel,
  SectionTitle,
} from "../me/ui";

const FALLBACK_CHECKLIST = [
  "Ask the group admin before posting — it takes one message.",
  "Post once per wave, not the same group twice in a day.",
  "Answer questions when people reply, then drop the link again.",
];

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: AmbassadorKitResponse };

export default function AmbassadorPage() {
  const { code = "" } = useParams<{ code: string }>();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/ambassador/${encodeURIComponent(code)}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("ambassador request failed");
        return (await response.json()) as AmbassadorKitResponse;
      })
      .then((data) => setState({ status: "ready", data }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [code]);

  if (state.status === "loading") {
    return (
      <PageShell title="Ambassador kit">
        <LoadingState label="Loading your kit" />
      </PageShell>
    );
  }

  if (state.status === "error") {
    return (
      <PageShell title="Ambassador kit">
        <ErrorState
          title="We couldn't find this kit"
          message="Check the link you were sent, or ask the NxtWave team for your code."
          action={
            <Link to="/" className={buttonClass({ variant: "primary" })}>
              Go to registration
            </Link>
          }
        />
      </PageShell>
    );
  }

  const { data } = state;
  const checklist = data.checklist.length > 0 ? data.checklist : FALLBACK_CHECKLIST;
  const shareContext: ShareContext = {
    project: null,
    link: data.referralLink,
    collegeShort: data.college,
    collegeRank: data.stats.collegeRank,
  };

  function shareClicked(variant: string) {
    trackEvent("share_clicked", { variant, surface: "ambassador", code: data.code });
  }

  return (
    <PageShell
      title={`${data.name}, here is your kit`}
      subtitle="Post in your class groups between 8 and 10 PM, when people actually read them."
    >
      <Panel>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-title text-ink">Your link</h2>
          {data.isSimulated ? <SimulatedBadge /> : null}
        </div>
        <p className="mt-3 break-all rounded-control border border-hairline bg-surface-2 px-3 py-2.5 font-mono text-label leading-relaxed text-ink">
          {data.referralLink}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <CopyButton
            text={data.referralLink}
            label="Copy my link"
            variant="primary"
            onCopied={() => shareClicked("copy")}
          />
          <a
            href={storyImagePath(data.code)}
            download={`ship60-${data.code}-story.png`}
            onClick={(event) => {
              event.preventDefault();
              shareClicked("story");
              void saveStoryImage(data.code, `ship60-${data.code}-story.png`);
            }}
            className={buttonClass({ variant: "secondary", fullWidth: true })}
          >
            Download story image
          </a>
        </div>
        <p className="mt-2 text-label text-ink-subtle">Long-press the image to save it.</p>
        <p className="mt-4 text-body-sm leading-relaxed text-ink-muted">
          Best posting window:{" "}
          <span className="font-medium text-ink">{data.postingWindow || "8–10 PM"}</span>
        </p>
      </Panel>

      <div className="mt-4 grid grid-cols-2 divide-x divide-hairline border-y border-hairline">
        <div className="min-w-0 border-b border-hairline p-4">
          <Stat value={data.stats.registrations} label="registrations" />
        </div>
        <div className="min-w-0 border-b border-hairline p-4">
          <Stat value={data.stats.qualified} label="checked in" />
        </div>
        <div className="min-w-0 p-4">
          <Stat
            value={data.stats.ambassadorRank ? `#${data.stats.ambassadorRank}` : "—"}
            label="ambassador rank"
          />
        </div>
        <div className="min-w-0 p-4">
          <Stat
            value={data.stats.collegeRank ? `#${data.stats.collegeRank}` : "—"}
            label={data.college ?? "college rank"}
          />
        </div>
      </div>

      <Panel className="mt-4">
        <SectionTitle>Your 3 messages</SectionTitle>
        <div className="divide-y divide-hairline">
          {WHATSAPP_VARIANTS.map((variant) => {
            const message = whatsappMessage(variant, shareContext);
            return (
              <div key={variant} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-body-sm font-medium text-ink">
                    {WHATSAPP_VARIANT_LABELS[variant]}
                  </h3>
                  <CopyButton
                    text={message}
                    label="Copy message"
                    className="shrink-0"
                    onCopied={() => shareClicked(variant)}
                  />
                </div>
                <p className="mt-2 text-body-sm leading-relaxed text-ink-muted">{message}</p>
                <a
                  href={whatsappShareUrl(variant, shareContext)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => shareClicked(variant)}
                  className={buttonClass({
                    variant: "secondary",
                    fullWidth: true,
                    className: "mt-3",
                  })}
                >
                  Open WhatsApp
                </a>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="mt-4">
        <SectionTitle>Post respectfully</SectionTitle>
        <ul className="divide-y divide-hairline">
          {checklist.map((item) => (
            <li key={item} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <CheckIcon className="mt-0.5 text-ink-subtle" />
              <span className="text-body-sm leading-relaxed text-ink-muted">{item}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <p className="mt-8 text-center text-body-sm">
        <Link
          to="/leaderboard"
          className="rounded-sm text-ink-muted underline decoration-hairline-strong underline-offset-4 transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          See where your college stands
        </Link>
      </p>
    </PageShell>
  );
}
