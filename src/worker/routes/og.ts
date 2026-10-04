/**
 * WS4 — OG share cards (PRD §4.2 M4).
 * PNG only (WhatsApp does not render SVG). Cached for OG_CACHE_SECONDS in the
 * Cache API. No PII beyond first name + last initial + college short name.
 */
import { Hono } from "hono";
import type { Context } from "hono";
import { ImageResponse } from "workers-og";
import { OG_CACHE_SECONDS } from "../../shared/constants";
import { ERROR_CODES } from "../../shared/errors";
import { IDEA_BANK } from "../../shared/idea-bank";
import type { AppContext, AppEnv } from "../env";
import { first } from "../lib/db";
import { apiError } from "../lib/http";
import { ogFontData } from "./og-font";

type OgVariant = "landscape" | "story";

const DIMENSIONS: Record<OgVariant, { width: number; height: number }> = {
  landscape: { width: 1200, height: 630 },
  story: { width: 1080, height: 1920 },
};

const COLORS = {
  paper: "#FBFCFE",
  ink: "#1F3A93",
  graphite: "#2E333B",
  margin: "#D7263D",
  rule: "#DDE5F2",
  highlight: "#FFE45C",
} as const;

const CODE_RE = /^[A-Za-z0-9]{1,24}$/;
const SUBMISSION_ID_RE = /^[A-Za-z0-9_-]{1,48}$/;
const FALLBACK_PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="),
  (ch) => ch.charCodeAt(0),
);

/* --------------------------------- text ---------------------------------- */

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** First name + last initial, e.g. "Rahul K." (PRD §7 privacy rule). */
function publicName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A student";
  if (parts.length === 1) return clip(parts[0], 24);
  const initial = parts[parts.length - 1]?.[0]?.toUpperCase() ?? "";
  return clip(`${parts[0]} ${initial}.`, 24);
}

function collegeName(short: string | null, other: string | null): string {
  const value = short ?? other ?? "NxtWave student";
  return clip(value, 32);
}

/** Resolve a stored `idea_key` to a display title via the bank or stored JSON. */
function projectTitle(ideaKey: string | null): string {
  if (!ideaKey) return "My first AI project";
  const trimmed = ideaKey.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { title?: unknown };
      if (typeof parsed.title === "string" && parsed.title.trim()) return clip(parsed.title, 90);
    } catch {
      /* fall through to key parsing */
    }
  }
  const [branch, interest] = trimmed.split(/[|:]/);
  const idea = IDEA_BANK[`${branch}|${interest}`];
  if (idea) return clip(idea.title, 90);
  return "My first AI project";
}

const dateLines = new Map<string, string>();

function workshopDateLine(iso: string): string {
  const cached = dateLines.get(iso);
  if (cached) return cached;
  let line = iso.slice(0, 10);
  try {
    const date = new Date(iso);
    const day = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date);
    const time = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
    line = `${day} · ${time} IST`;
  } catch {
    /* keep ISO date fallback */
  }
  dateLines.set(iso, line);
  return line;
}

function baseHost(env: AppEnv, request: Request): string {
  const configured = env.PUBLIC_BASE_URL;
  try {
    const host = new URL(configured && configured.length > 0 ? configured : request.url).host;
    if (host) return host;
  } catch {
    /* fall through */
  }
  return "ship60.dev";
}

function shortLink(env: AppEnv, request: Request, code: string): string {
  return clip(`${baseHost(env, request)}/r/${code}`, 38);
}

/* --------------------------------- layout -------------------------------- */

function ruleLines(width: number, height: number, top: number, step: number, left: number): string {
  let out = "";
  for (let y = top; y < height - 20; y += step) {
    out += `<div style="display:flex;position:absolute;top:${y}px;left:${left}px;width:${width - left - 40}px;height:2px;background:${COLORS.rule};"></div>`;
  }
  return out;
}

function marginRule(height: number, left: number): string {
  return `<div style="display:flex;position:absolute;top:0;left:${left}px;width:3px;height:${height}px;background:${COLORS.margin};"></div>`;
}

interface CardData {
  name: string;
  college: string;
  project: string;
  seatNo: number;
  shortLink: string;
  dateLine: string;
}

function referralLandscapeHtml(data: CardData): string {
  return `<div style="display:flex;position:relative;width:1200px;height:630px;background:${COLORS.paper};font-family:Archivo;color:${COLORS.graphite};">
  ${ruleLines(1200, 630, 72, 52, 118)}
  ${marginRule(630, 96)}
  <div style="display:flex;flex-direction:column;position:absolute;left:140px;top:52px;width:1000px;height:526px;">
    <div style="display:flex;flex-direction:row;justify-content:space-between;align-items:center;width:1000px;">
      <div style="display:flex;font-size:22px;font-weight:700;color:${COLORS.ink};">NxtWave · free 60-min AI workshop</div>
      <div style="display:flex;font-size:22px;color:${COLORS.graphite};">${esc(data.dateLine)}</div>
    </div>
    <div style="display:flex;margin-top:56px;font-size:32px;color:${COLORS.graphite};">${esc(data.name)} is building</div>
    <div style="display:flex;align-self:flex-start;margin-top:16px;padding:6px 22px 12px 22px;background:${COLORS.highlight};font-size:58px;font-weight:700;line-height:1.08;color:${COLORS.ink};max-width:960px;">${esc(data.project)}</div>
    <div style="display:flex;flex-direction:row;justify-content:space-between;align-items:flex-end;width:1000px;margin-top:auto;">
      <div style="display:flex;flex-direction:column;">
        <div style="display:flex;font-size:26px;color:${COLORS.graphite};">Seat #${data.seatNo} · ${esc(data.college)}</div>
        <div style="display:flex;margin-top:12px;font-size:32px;font-weight:700;color:${COLORS.ink};">${esc(data.shortLink)}</div>
      </div>
      <div style="display:flex;padding:14px 26px;border:2px solid ${COLORS.ink};border-radius:999px;font-size:24px;color:${COLORS.ink};">Join me · free</div>
    </div>
  </div>
</div>`;
}

function referralStoryHtml(data: CardData): string {
  return `<div style="display:flex;position:relative;width:1080px;height:1920px;background:${COLORS.paper};font-family:Archivo;color:${COLORS.graphite};">
  ${ruleLines(1080, 1920, 120, 88, 150)}
  ${marginRule(1920, 118)}
  <div style="display:flex;flex-direction:column;position:absolute;left:170px;top:110px;width:850px;height:1700px;">
    <div style="display:flex;flex-direction:column;">
      <div style="display:flex;font-size:34px;font-weight:700;color:${COLORS.ink};">NxtWave · free 60-min AI workshop</div>
      <div style="display:flex;margin-top:14px;font-size:32px;color:${COLORS.graphite};">${esc(data.dateLine)}</div>
    </div>
    <div style="display:flex;margin-top:220px;font-size:52px;color:${COLORS.graphite};">${esc(data.name)} is building</div>
    <div style="display:flex;align-self:flex-start;margin-top:30px;padding:12px 34px 22px 34px;background:${COLORS.highlight};font-size:88px;font-weight:700;line-height:1.1;color:${COLORS.ink};max-width:850px;">${esc(data.project)}</div>
    <div style="display:flex;margin-top:90px;font-size:44px;color:${COLORS.graphite};">Seat #${data.seatNo} · ${esc(data.college)}</div>
    <div style="display:flex;margin-top:auto;flex-direction:column;">
      <div style="display:flex;font-size:52px;font-weight:700;color:${COLORS.ink};">${esc(data.shortLink)}</div>
      <div style="display:flex;margin-top:28px;align-self:flex-start;padding:20px 40px;border:3px solid ${COLORS.ink};border-radius:999px;font-size:38px;color:${COLORS.ink};">Join me · free</div>
    </div>
  </div>
</div>`;
}

function defaultLandscapeHtml(dateLine: string, host: string): string {
  return `<div style="display:flex;position:relative;width:1200px;height:630px;background:${COLORS.paper};font-family:Archivo;color:${COLORS.graphite};">
  ${ruleLines(1200, 630, 72, 52, 118)}
  ${marginRule(630, 96)}
  <div style="display:flex;flex-direction:column;position:absolute;left:140px;top:52px;width:1000px;height:526px;">
    <div style="display:flex;flex-direction:row;justify-content:space-between;align-items:center;width:1000px;">
      <div style="display:flex;font-size:22px;font-weight:700;color:${COLORS.ink};">Ship60 · by NxtWave</div>
      <div style="display:flex;font-size:22px;color:${COLORS.graphite};">${esc(dateLine)}</div>
    </div>
    <div style="display:flex;flex-direction:column;margin-top:56px;">
      <div style="display:flex;font-size:70px;font-weight:700;line-height:1.12;color:${COLORS.graphite};">Build your first</div>
      <div style="display:flex;align-self:flex-start;margin-top:6px;padding:4px 20px 10px 20px;background:${COLORS.highlight};font-size:70px;font-weight:700;line-height:1.12;color:${COLORS.ink};">AI project</div>
      <div style="display:flex;margin-top:6px;font-size:70px;font-weight:700;line-height:1.12;color:${COLORS.graphite};">in 60 minutes.</div>
    </div>
    <div style="display:flex;margin-top:24px;font-size:30px;color:${COLORS.graphite};">Free live workshop · no coding experience needed · you deploy it live.</div>
    <div style="display:flex;flex-direction:row;justify-content:space-between;align-items:flex-end;width:1000px;margin-top:auto;">
      <div style="display:flex;font-size:32px;font-weight:700;color:${COLORS.ink};">${esc(host)}</div>
      <div style="display:flex;padding:14px 26px;border:2px solid ${COLORS.ink};border-radius:999px;font-size:24px;color:${COLORS.ink};">Register free</div>
    </div>
  </div>
</div>`;
}

function defaultStoryHtml(dateLine: string, host: string): string {
  return `<div style="display:flex;position:relative;width:1080px;height:1920px;background:${COLORS.paper};font-family:Archivo;color:${COLORS.graphite};">
  ${ruleLines(1080, 1920, 120, 88, 150)}
  ${marginRule(1920, 118)}
  <div style="display:flex;flex-direction:column;position:absolute;left:170px;top:110px;width:850px;height:1700px;">
    <div style="display:flex;flex-direction:column;">
      <div style="display:flex;font-size:34px;font-weight:700;color:${COLORS.ink};">Ship60 · by NxtWave</div>
      <div style="display:flex;margin-top:14px;font-size:32px;color:${COLORS.graphite};">${esc(dateLine)}</div>
    </div>
    <div style="display:flex;flex-direction:column;margin-top:220px;">
      <div style="display:flex;font-size:100px;font-weight:700;line-height:1.12;color:${COLORS.graphite};">Build your first</div>
      <div style="display:flex;align-self:flex-start;margin-top:10px;padding:6px 28px 16px 28px;background:${COLORS.highlight};font-size:100px;font-weight:700;line-height:1.12;color:${COLORS.ink};">AI project</div>
      <div style="display:flex;margin-top:10px;font-size:100px;font-weight:700;line-height:1.12;color:${COLORS.graphite};">in 60 minutes.</div>
    </div>
    <div style="display:flex;margin-top:50px;font-size:44px;color:${COLORS.graphite};">Free live workshop · no coding experience needed · you deploy it live.</div>
    <div style="display:flex;margin-top:auto;flex-direction:column;">
      <div style="display:flex;font-size:52px;font-weight:700;color:${COLORS.ink};">${esc(host)}</div>
      <div style="display:flex;margin-top:28px;align-self:flex-start;padding:20px 40px;border:3px solid ${COLORS.ink};border-radius:999px;font-size:38px;color:${COLORS.ink};">Register free</div>
    </div>
  </div>
</div>`;
}

function shippedLandscapeHtml(data: {
  name: string;
  score: number | null;
  shortLink: string;
  dateLine: string;
}): string {
  const headline = data.score === null ? "I shipped it" : `${data.score}/100`;
  const sub =
    data.score === null
      ? "Built and deployed live in the 60-minute NxtWave workshop."
      : "Built and deployed live in the 60-minute NxtWave workshop, and scored by the AI reviewer.";
  return `<div style="display:flex;position:relative;width:1200px;height:630px;background:${COLORS.paper};font-family:Archivo;color:${COLORS.graphite};">
  ${ruleLines(1200, 630, 72, 52, 118)}
  ${marginRule(630, 96)}
  <div style="display:flex;flex-direction:column;position:absolute;left:140px;top:52px;width:1000px;height:526px;">
    <div style="display:flex;flex-direction:row;justify-content:space-between;align-items:center;width:1000px;">
      <div style="display:flex;font-size:22px;font-weight:700;color:${COLORS.ink};">Ship60 · by NxtWave</div>
      <div style="display:flex;font-size:22px;color:${COLORS.graphite};">${esc(data.dateLine)}</div>
    </div>
    <div style="display:flex;margin-top:52px;font-size:32px;color:${COLORS.graphite};">${esc(data.name)} shipped it</div>
    <div style="display:flex;align-self:flex-start;margin-top:14px;padding:6px 26px 14px 26px;background:${COLORS.highlight};font-size:76px;font-weight:700;line-height:1.05;color:${COLORS.ink};">${esc(headline)}</div>
    <div style="display:flex;margin-top:20px;font-size:28px;color:${COLORS.graphite};max-width:940px;">${esc(sub)}</div>
    <div style="display:flex;margin-top:auto;font-size:30px;font-weight:700;color:${COLORS.ink};">Start yours: ${esc(data.shortLink)}</div>
  </div>
</div>`;
}

/* ------------------------------ data + render ----------------------------- */

interface OgUserRow {
  name: string;
  ref_code: string;
  seat_no: number;
  idea_key: string | null;
  college_short: string | null;
  college_other: string | null;
}

interface OgShippedRow {
  id: string;
  score: number | null;
  status: string;
  name: string;
  ref_code: string;
}

async function loadUser(env: AppEnv, code: string): Promise<OgUserRow | null> {
  if (!CODE_RE.test(code)) return null;
  return first<OgUserRow>(
    env.DB,
    `SELECT u.name, u.ref_code, u.seat_no, u.idea_key,
            c.short_name AS college_short, u.college_other
     FROM users u
     LEFT JOIN colleges c ON c.id = u.college_id
     WHERE u.ref_code = ? LIMIT 1`,
    code.toUpperCase(),
  );
}

function cardData(env: AppEnv, request: Request, user: OgUserRow): CardData {
  return {
    name: publicName(user.name),
    college: collegeName(user.college_short, user.college_other),
    project: projectTitle(user.idea_key),
    seatNo: user.seat_no,
    shortLink: shortLink(env, request, user.ref_code),
    dateLine: workshopDateLine(env.WORKSHOP_START_ISO),
  };
}

function ogFonts() {
  return [
    { name: "Archivo", data: ogFontData("archivo400"), weight: 400 as const, style: "normal" as const },
    { name: "Archivo", data: ogFontData("archivo700"), weight: 700 as const, style: "normal" as const },
  ];
}

async function renderPng(html: string, variant: OgVariant): Promise<Response> {
  const { width, height } = DIMENSIONS[variant];
  const image = new ImageResponse(html, { width, height, fonts: ogFonts(), format: "png" });
  const bytes = await image.arrayBuffer();
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": `public, max-age=${OG_CACHE_SECONDS}, s-maxage=${OG_CACHE_SECONDS}`,
    },
  });
}

async function serveCached(
  c: Context<AppContext>,
  variant: OgVariant,
  html: string,
): Promise<Response> {
  const cacheKey = new Request(c.req.url, { method: "GET" });
  const cache = caches.default;
  try {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  } catch {
    /* cache unavailable (e.g. local test runtime) — render directly */
  }
  const response = await renderPng(html, variant);
  try {
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  } catch {
    /* no execution context — skip caching */
  }
  return response;
}

function fallbackResponse(): Response {
  return new Response(FALLBACK_PNG, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": `public, max-age=${OG_CACHE_SECONDS}`,
    },
  });
}

async function safeRender(
  c: Context<AppContext>,
  variant: OgVariant,
  html: string,
  fallbackHtml: string,
): Promise<Response> {
  try {
    return await serveCached(c, variant, html);
  } catch (error) {
    console.error("[og] render failed", error);
    try {
      return await serveCached(c, variant, fallbackHtml);
    } catch {
      return fallbackResponse();
    }
  }
}

/* --------------------------------- routes -------------------------------- */

const app = new Hono<AppContext>();

app.get("/og/default.png", async (c) => {
  const dateLine = workshopDateLine(c.env.WORKSHOP_START_ISO);
  const host = baseHost(c.env, c.req.raw);
  return safeRender(
    c,
    "landscape",
    defaultLandscapeHtml(dateLine, host),
    defaultLandscapeHtml(dateLine, host),
  );
});

app.get("/og/default/story.png", async (c) => {
  const dateLine = workshopDateLine(c.env.WORKSHOP_START_ISO);
  const host = baseHost(c.env, c.req.raw);
  return safeRender(
    c,
    "story",
    defaultStoryHtml(dateLine, host),
    defaultStoryHtml(dateLine, host),
  );
});

app.get("/og/shipped/:file", async (c) => {
  const file = c.req.param("file");
  const id = file.endsWith(".png") ? file.slice(0, -4) : "";
  const dateLine = workshopDateLine(c.env.WORKSHOP_START_ISO);
  const host = baseHost(c.env, c.req.raw);
  const defaultHtml = defaultLandscapeHtml(dateLine, host);
  if (!SUBMISSION_ID_RE.test(id)) {
    return safeRender(c, "landscape", defaultHtml, defaultHtml);
  }
  const row = await first<OgShippedRow>(
    c.env.DB,
    `SELECT s.id, s.score, s.status, u.name, u.ref_code
     FROM submissions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? LIMIT 1`,
    id,
  );
  if (!row) {
    return safeRender(c, "landscape", defaultHtml, defaultHtml);
  }
  const html = shippedLandscapeHtml({
    name: publicName(row.name),
    score: typeof row.score === "number" ? row.score : null,
    shortLink: shortLink(c.env, c.req.raw, row.ref_code),
    dateLine,
  });
  return safeRender(c, "landscape", html, defaultHtml);
});

app.get("/og/:code/story.png", async (c) => {
  const dateLine = workshopDateLine(c.env.WORKSHOP_START_ISO);
  const host = baseHost(c.env, c.req.raw);
  const defaultHtml = defaultStoryHtml(dateLine, host);
  const user = await loadUser(c.env, c.req.param("code"));
  if (!user) {
    return safeRender(c, "story", defaultHtml, defaultHtml);
  }
  return safeRender(c, "story", referralStoryHtml(cardData(c.env, c.req.raw, user)), defaultHtml);
});

app.get("/og/:file", async (c) => {
  const file = c.req.param("file");
  if (!file.endsWith(".png")) {
    return apiError(ERROR_CODES.NOT_FOUND, "Unknown OG image.");
  }
  const dateLine = workshopDateLine(c.env.WORKSHOP_START_ISO);
  const host = baseHost(c.env, c.req.raw);
  const defaultHtml = defaultLandscapeHtml(dateLine, host);
  const user = await loadUser(c.env, file.slice(0, -4));
  if (!user) {
    return safeRender(c, "landscape", defaultHtml, defaultHtml);
  }
  return safeRender(
    c,
    "landscape",
    referralLandscapeHtml(cardData(c.env, c.req.raw, user)),
    defaultHtml,
  );
});

export default app;
