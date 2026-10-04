/**
 * WS1 — /r/:code referral landing HTML with OG tags + ref cookie + variant capture.
 * WhatsApp needs a rich preview, so this is a real page, not a bare 302 (PRD M2).
 */
import { Hono } from "hono";
import {
  COOKIE_REF,
  RATE_LIMITS,
  REF_COOKIE_DAYS,
  WHATSAPP_VARIANTS,
  type WhatsAppVariant,
} from "../../shared/constants";
import type { AppContext } from "../env";
import { buildSetCookie, getCookie, hashIp, ipHashSalt, publicName } from "../lib/auth";
import { first, type UserRow } from "../lib/db";
import { recordEvent } from "../lib/events";
import { escapeHtml, safeJsonForScript } from "../lib/http";
import { resolveIdeaCard } from "../lib/idea-card";
import { clientIp, rateLimit } from "../lib/ratelimit";

const app = new Hono<AppContext>();

app.get("/r/:code", async (c) => {
  const code = c.req.param("code").trim().toUpperCase();
  const db = c.env.DB;
  const user = await first<UserRow>(
    db,
    "SELECT * FROM users WHERE UPPER(ref_code) = ? AND is_simulated = 0 LIMIT 1",
    code,
  );
  if (!user) {
    return new Response(null, {
      status: 302,
      headers: { location: "/", "cache-control": "no-store" },
    });
  }

  // First touch wins: an existing s60_ref cookie keeps its code and the landing
  // redirect carries that code forward (PRD M2).
  const existing = getCookie(c.req.raw, COOKIE_REF)?.trim() ?? "";
  const attribution = existing ? existing.toUpperCase() : user.ref_code;
  const rawVariant = c.req.query("v") ?? "";
  const variant: WhatsAppVariant | null = (WHATSAPP_VARIANTS as readonly string[]).includes(
    rawVariant,
  )
    ? (rawVariant as WhatsAppVariant)
    : null;

  const ipHash = await hashIp(clientIp(c.req.raw), ipHashSalt(c.env));
  const limited = await rateLimit(
    c.env.CACHE,
    `landing:${ipHash}`,
    RATE_LIMITS.referralLanding.limit,
    RATE_LIMITS.referralLanding.windowSeconds,
  );
  if (limited.ok) {
    await recordEvent(db, {
      type: "referral_landing",
      refCode: attribution,
      props: { v: variant, landingCode: user.ref_code },
    });
  }

  const base = (c.env.PUBLIC_BASE_URL || new URL(c.req.url).origin).replace(/\/+$/, "");
  const target = `/?ref=${encodeURIComponent(attribution)}${variant ? `&v=${encodeURIComponent(variant)}` : ""}`;
  const display = publicName(user.name);
  const idea = resolveIdeaCard(user.idea_key);
  const title = `${display} is building ${idea ? `"${idea.title}"` : "their first AI project"} in 60 minutes`;
  const description = `Free live workshop by NxtWave this Sunday. ${display} is going — join from your phone and deploy your first AI project in 60 minutes.`;
  const ogImage = `${base}/og/${user.ref_code}.png`;
  const ogUrl = `${base}/r/${user.ref_code}`;

  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${escapeHtml(ogUrl)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${escapeHtml(ogImage)}">
<meta name="theme-color" content="#1F3A93">
<script>window.location.replace(${safeJsonForScript(target)});</script>
<noscript><meta http-equiv="refresh" content="0;url=${escapeHtml(target)}"></noscript>
</head>
<body>
<p>Taking you to the workshop… <a href="${escapeHtml(target)}">Continue</a></p>
</body>
</html>`;

  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    // This one page needs a single inline redirect script; nothing else is allowed.
    "content-security-policy":
      "default-src 'none'; script-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'",
  });
  if (!existing) {
    headers.append(
      "set-cookie",
      buildSetCookie(COOKIE_REF, attribution, {
        maxAgeSeconds: REF_COOKIE_DAYS * 86400,
        httpOnly: false,
        sameSite: "Lax",
        secure: true,
        path: "/",
      }),
    );
  }
  return new Response(page, { status: 200, headers });
});

export default app;
