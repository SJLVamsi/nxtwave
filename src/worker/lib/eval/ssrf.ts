/**
 * SSRF guard for user-supplied URLs (PRD M9, AGENTS.md rule 9).
 *
 * Options considered: blocklist-only regex vs URL parse + host classification.
 * Choice: parse with `URL`, require http/https, allow only ports 80/443, and
 * reject loopback/private/link-local/CGNAT/metadata hosts, including the common
 * numeric encodings of 127.0.0.1. Rejected: DNS-over-HTTPS pre-resolution — it
 * adds a second request per submission (latency + cost) and still leaves a
 * TOCTOU window, so it was not worth it here; the limitation is documented in
 * DECISIONS.md (WS7).
 */

export type UrlGuardResult = { ok: true; url: URL } | { ok: false; reason: string };

const ALLOWED_PORTS = new Set(["", "80", "443"]);

export function validateTargetUrl(raw: string): UrlGuardResult {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "That does not look like a valid link." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https links can be checked." };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "Links with embedded credentials are not allowed." };
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    return { ok: false, reason: "Only standard web ports (80 or 443) are allowed." };
  }
  if (isPrivateHostname(url.hostname)) {
    return { ok: false, reason: "That address is not reachable from the public internet." };
  }
  return { ok: true, url };
}

export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".home.arpa")) return true;
  if (host === "metadata" || host.startsWith("metadata.")) return true;
  if (host.includes(":")) return isPrivateIpv6(host);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return isPrivateIpv4(host);
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/.test(host)) return true;
  return false;
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const value = host.split("%")[0];
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb")) {
    return true;
  }
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (value.startsWith("ff")) return true;
  if (value.startsWith("64:ff9b:")) return true;
  const mapped = value.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  const mappedHex = value.match(/::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16);
    const low = parseInt(mappedHex[2], 16);
    return isPrivateIpv4(`${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`);
  }
  return false;
}
