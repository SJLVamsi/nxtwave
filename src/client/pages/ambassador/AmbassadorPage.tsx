/**
 * WS4 — Ambassador kit (PRD §4.2 M7): link, 3 message variants, story image,
 * posting window, stats, respectful-posting checklist.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { WHATSAPP_VARIANTS } from "../../../shared/constants";
import type { AmbassadorKitResponse } from "../../../shared/contracts";
import { trackEvent } from "../me/events";
import {
  WHATSAPP_VARIANT_LABELS,
  storyImagePath,
  whatsappMessage,
  whatsappShareUrl,
  type ShareContext,
} from "../me/share";
import { CopyButton, ErrorState, LoadingState, PageShell, Panel, SectionTitle } from "../me/ui";

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
      <Panel className="border-l-4 border-l-[#D7263D]">
        <p className="text-xs font-bold text-[#1F3A93]">Your link</p>
        <p className="mt-1 break-all text-sm font-bold text-[#1F3A93]">{data.referralLink}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton
            text={data.referralLink}
            label="Copy my link"
            onCopied={() => shareClicked("copy")}
          />
          <a
            href={storyImagePath(data.code)}
            download={`ship60-${data.code}-story.png`}
            onClick={() => shareClicked("story")}
            className="inline-flex min-h-11 items-center rounded-md border border-[#DDE5F2] px-3 text-sm font-bold text-[#2E333B]"
          >
            Download story image
          </a>
        </div>
        <p className="mt-3 text-sm">
          Best posting window: <span className="font-bold">{data.postingWindow || "8–10 PM"}</span>
        </p>
      </Panel>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Panel>
          <p className="text-xs font-bold">Registrations</p>
          <p className="mt-1 text-2xl font-bold text-[#1F3A93]">{data.stats.registrations}</p>
        </Panel>
        <Panel>
          <p className="text-xs font-bold">Checked in</p>
          <p className="mt-1 text-2xl font-bold text-[#1F3A93]">{data.stats.qualified}</p>
        </Panel>
        <Panel>
          <p className="text-xs font-bold">Ambassador rank</p>
          <p className="mt-1 text-2xl font-bold text-[#1F3A93]">
            {data.stats.ambassadorRank ? `#${data.stats.ambassadorRank}` : "—"}
          </p>
        </Panel>
        <Panel>
          <p className="text-xs font-bold">College rank</p>
          <p className="mt-1 text-2xl font-bold text-[#1F3A93]">
            {data.stats.collegeRank ? `#${data.stats.collegeRank}` : "—"}
          </p>
          <p className="truncate text-xs">{data.college ?? ""}</p>
        </Panel>
      </div>

      <Panel className="mt-4">
        <SectionTitle>Your 3 messages</SectionTitle>
        <div className="space-y-4">
          {WHATSAPP_VARIANTS.map((variant) => {
            const message = whatsappMessage(variant, shareContext);
            return (
              <div key={variant} className="rounded-md border border-[#DDE5F2] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#1F3A93]">
                    {WHATSAPP_VARIANT_LABELS[variant]}
                  </p>
                  <CopyButton text={message} label="Copy message" onCopied={() => shareClicked(variant)} />
                </div>
                <p className="mt-2 text-sm leading-relaxed">{message}</p>
                <a
                  href={whatsappShareUrl(variant, shareContext)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => shareClicked(variant)}
                  className="mt-2 inline-flex min-h-11 items-center justify-center rounded-md bg-[#1F3A93] px-4 text-sm font-bold text-white"
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
        <ul className="list-inside list-disc space-y-2 text-sm">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Panel>

      <p className="mt-6 text-center text-sm">
        <Link className="font-bold text-[#1F3A93] underline" to="/leaderboard">
          See where your college stands
        </Link>
      </p>
    </PageShell>
  );
}
