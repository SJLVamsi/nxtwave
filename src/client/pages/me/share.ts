/**
 * WS4 — share copy and URL builders (PRD M3/M7).
 * Pure functions so they can be unit-tested; no DOM access here.
 */
import type { WhatsAppVariant } from "../../../shared/constants";

export interface ShareContext {
  project?: string | null;
  link: string;
  collegeShort?: string | null;
  collegeRank?: number | null;
}

/** Append the message-variant marker used for A/B tracking (PRD M2/M3). */
export function trackedReferralLink(link: string, variant: string): string {
  const separator = link.includes("?") ? "&" : "?";
  return `${link}${separator}v=${encodeURIComponent(variant)}`;
}

export function whatsappMessage(variant: WhatsAppVariant, ctx: ShareContext): string {
  const link = trackedReferralLink(ctx.link, variant);
  const project = ctx.project?.trim() || "an AI project";
  switch (variant) {
    case "en":
      return `I'm building my first AI project live this Sunday in 60 minutes (free, by NxtWave). Mine is ${project}. Join with my link and we'll build together: ${link}`;
    case "te":
      return `Bro, Sunday 60 mins lo oka AI project build chesi live deploy cheddam. Free workshop, NxtWave di. Nenu register ayya, nuvvu kuda join avvu: ${link}`;
    case "fomo": {
      const college = ctx.collegeShort?.trim() || "My college";
      const rank = ctx.collegeRank;
      if (typeof rank === "number" && rank > 0) {
        return `${college} is at #${rank} on the leaderboard for NxtWave's AI build workshop. Free, 60 mins, Sunday. Let's push us up: ${link}`;
      }
      return whatsappMessage("en", ctx);
    }
  }
}

export function whatsappShareUrl(variant: WhatsAppVariant, ctx: ShareContext): string {
  return `https://wa.me/?text=${encodeURIComponent(whatsappMessage(variant, ctx))}`;
}

export function linkedinShareUrl(link: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
}

export function storyImagePath(code: string): string {
  return `/og/${encodeURIComponent(code)}/story.png`;
}

function calendarStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function googleCalendarUrl(options: {
  title: string;
  details: string;
  startIso: string;
  durationMinutes?: number;
}): string {
  const start = new Date(options.startIso);
  const end = new Date(start.getTime() + (options.durationMinutes ?? 90) * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: options.title,
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    details: options.details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export const WHATSAPP_VARIANT_LABELS: Record<WhatsAppVariant, string> = {
  en: "English",
  te: "Telugu",
  fomo: "FOMO",
};
