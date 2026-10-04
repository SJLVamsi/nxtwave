import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import {
  googleCalendarUrl,
  linkedinShareUrl,
  storyImagePath,
  trackedReferralLink,
  whatsappMessage,
  whatsappShareUrl,
} from "../../src/client/pages/me/share";
import { projectTitle } from "../../src/worker/routes/og";

const base = "https://ship60.test";

interface PngInfo {
  signature: string;
  width: number;
  height: number;
}

async function getImage(path: string): Promise<{ response: Response; bytes: Uint8Array }> {
  const response = await SELF.fetch(`${base}${path}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { response, bytes };
}

function pngInfo(bytes: Uint8Array): PngInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    signature: String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0),
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

beforeAll(async () => {
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO colleges (id, name, short_name, city, state) VALUES (?, ?, ?, ?, ?)",
    ).bind("col1", "VNR Vignana Jyothi Institute of Engineering and Technology", "VNR VJIET", "Hyderabad", "Telangana"),
    env.DB.prepare(
      `INSERT INTO users (
        id, name, email, phone, college_id, college_other, branch, grad_year, role,
        ref_code, referred_by, token_hash, seat_no, idea_key,
        utm_source, utm_medium, utm_campaign, utm_content, share_variant,
        ip_hash, user_agent, consent_at, flag_reason, flag_status, is_simulated, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      "u1", "Rahul Kumar", "rahul@example.com", "+919876543210", "col1", null,
      "CSE/IT/AI-ML", 2027, "student",
      "RAHUL7K2", null, "token-hash-1", 7, "CSE/IT/AI-ML|cricket",
      null, null, null, null, null,
      null, null, "2026-10-01T00:00:00.000Z", null, null, 1, "2026-10-01T00:00:00.000Z",
    ),
    env.DB.prepare(
      `INSERT INTO submissions (id, user_id, live_url, repo_url, description, status, score, evaluation, cert_id, is_simulated, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      "sub1", "u1", "https://example.com", null, "Gully cricket commentator",
      "evaluated", 87, null, null, 1, "2026-10-11T14:00:00.000Z",
    ),
    // WS2 stores registrations with the `idea:{branch}:{interest}:{variant}` key.
    env.DB.prepare(
      `INSERT INTO users (
        id, name, email, phone, college_id, college_other, branch, grad_year, role,
        ref_code, referred_by, token_hash, seat_no, idea_key,
        utm_source, utm_medium, utm_campaign, utm_content, share_variant,
        ip_hash, user_agent, consent_at, flag_reason, flag_status, is_simulated, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      "u2", "Priya Sharma", "priya@example.com", "+919876543211", "col1", null,
      "CSE/IT/AI-ML", 2027, "student",
      "PRIYA9X2", null, "token-hash-2", 8, "idea:CSE/IT/AI-ML:placements:0",
      null, null, null, null, null,
      null, null, "2026-10-01T00:00:00.000Z", null, null, 0, "2026-10-01T00:00:00.000Z",
    ),
  ]);
});

describe("OG images", () => {
  it("serves a non-trivial PNG for the default card with cache headers", async () => {
    const { response, bytes } = await getImage("/og/default.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(response.headers.get("cache-control")).toContain("max-age=3600");
    expect(bytes.byteLength).toBeGreaterThan(2000);
    const info = pngInfo(bytes);
    expect(info.signature).toBe("\x89PNG");
    expect(info.width).toBe(1200);
    expect(info.height).toBe(630);
  });

  it("serves a referral card for a known code", async () => {
    const { response, bytes } = await getImage("/og/RAHUL7K2.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(response.headers.get("cache-control")).toContain("max-age=3600");
    const info = pngInfo(bytes);
    expect(info.signature).toBe("\x89PNG");
    expect(info.width).toBe(1200);
    expect(info.height).toBe(630);
  });

  it("falls back to the default card for an unknown code with status 200", async () => {
    const { response, bytes } = await getImage("/og/NOPE99.png");
    expect(response.status).toBe(200);
    const info = pngInfo(bytes);
    expect(info.signature).toBe("\x89PNG");
    expect(info.width).toBe(1200);
    expect(info.height).toBe(630);
  });

  it("renders the story card at 1080x1920, different from landscape", async () => {
    const landscape = await getImage("/og/RAHUL7K2.png");
    const story = await getImage("/og/RAHUL7K2/story.png");
    expect(story.response.status).toBe(200);
    const landscapeInfo = pngInfo(landscape.bytes);
    const storyInfo = pngInfo(story.bytes);
    expect(storyInfo.signature).toBe("\x89PNG");
    expect(storyInfo.width).toBe(1080);
    expect(storyInfo.height).toBe(1920);
    expect(storyInfo.height).not.toBe(landscapeInfo.height);
  });

  it("resolves the real WS2 idea key to the generated project title", async () => {
    expect(projectTitle("idea:CSE/IT/AI-ML:placements:0")).toBe("Placement Prep Buddy");
    expect(projectTitle("CSE/IT/AI-ML|cricket")).toBe("Gully Cricket Commentator");
    expect(projectTitle(null)).toBe("My first AI project");

    const { response, bytes } = await getImage("/og/PRIYA9X2.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(pngInfo(bytes).signature).toBe("\x89PNG");
  });

  it("serves a shipped card for a submission and falls back for unknown ids", async () => {
    const shipped = await getImage("/og/shipped/sub1.png");
    expect(shipped.response.status).toBe(200);
    expect(pngInfo(shipped.bytes).signature).toBe("\x89PNG");
    const missing = await getImage("/og/shipped/does-not-exist.png");
    expect(missing.response.status).toBe(200);
    expect(pngInfo(missing.bytes).signature).toBe("\x89PNG");
  });
});

describe("share URL builders", () => {
  const link = "https://ship60.example/r/RAHUL7K2";

  it("adds the v variant param to the referral link", () => {
    expect(trackedReferralLink(link, "te")).toBe(`${link}?v=te`);
    expect(trackedReferralLink(`${link}?ref=RAHUL7K2`, "fomo")).toBe(
      `${link}?ref=RAHUL7K2&v=fomo`,
    );
  });

  it("builds WhatsApp messages with the exact PRD copy and an encoded wa.me URL", () => {
    const en = whatsappMessage("en", { project: "Gully Cricket Commentator", link });
    expect(en).toBe(
      `I'm building my first AI project live this Sunday in 60 minutes (free, by NxtWave). Mine is Gully Cricket Commentator. Join with my link and we'll build together: ${link}?v=en`,
    );
    const te = whatsappMessage("te", { link });
    expect(te).toBe(
      `Bro, Sunday 60 mins lo oka AI project build chesi live deploy cheddam. Free workshop, NxtWave di. Nenu register ayya, nuvvu kuda join avvu: ${link}?v=te`,
    );
    const url = whatsappShareUrl("te", { link });
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url.slice("https://wa.me/?text=".length))).toBe(te);
  });

  it("uses the fomo copy when a college rank exists and falls back to English otherwise", () => {
    const fomo = whatsappMessage("fomo", {
      link,
      collegeShort: "VNR VJIET",
      collegeRank: 3,
    });
    expect(fomo).toBe(
      `VNR VJIET is at #3 on the leaderboard for NxtWave's AI build workshop. Free, 60 mins, Sunday. Let's push us up: ${link}?v=fomo`,
    );
    const fallback = whatsappMessage("fomo", { link, collegeShort: "VNR VJIET" });
    expect(fallback).toContain("Join with my link");
    expect(fallback).toContain("v=en");
  });

  it("builds LinkedIn, story image and Google Calendar URLs", () => {
    expect(linkedinShareUrl(link)).toBe(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
    );
    expect(storyImagePath("RAHUL7K2")).toBe("/og/RAHUL7K2/story.png");
    const calendar = googleCalendarUrl({
      title: "Build Your First AI Project in 60 Minutes — NxtWave",
      details: "Ship60",
      startIso: "2026-10-11T13:30:00.000Z",
      durationMinutes: 90,
    });
    expect(calendar).toContain("action=TEMPLATE");
    expect(calendar).toContain("dates=20261011T133000Z%2F20261011T150000Z");
  });
});
