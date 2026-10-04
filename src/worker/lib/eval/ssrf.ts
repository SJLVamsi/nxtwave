/**
 * SSRF guard for user-supplied URLs (PRD M9, AGENTS.md rule 9).
 *
 * Literal hosts are classified directly; every hostname is additionally resolved
 * (A and AAAA) before it is fetched, so a public name that points at a private
 * address (`localtest.me`, `127.0.0.1.nip.io`) is rejected at validation time.
 * The default resolver uses Cloudflare DoH JSON with a 1.5 s timeout and a 60 s
 * in-isolate cache; tests inject a resolver so no network I/O happens.
 */

export type UrlGuardResult = { ok: true; url: URL } | { ok: false; reason: string };

export type DnsResolver = (hostname: string) => Promise<string[]>;

export interface UrlGuardOptions {
  /** Injectable DNS resolver. Defaults to Cloudflare DoH JSON. */
  resolve?: DnsResolver;
}

const ALLOWED_PORTS = new Set(["", "80", "443"]);
const DNS_TIMEOUT_MS = 1_500;
const DNS_CACHE_TTL_MS = 60_000;
const DNS_CACHE_MAX_ENTRIES = 512;
const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const DOH_A = 1;
const DOH_AAAA = 28;

interface DnsCacheEntry {
  expiresAt: number;
  addresses: string[];
}

const dnsCache = new Map<string, DnsCacheEntry>();

/** Default resolver: Cloudflare DoH JSON, A + AAAA, 1.5 s timeout, 60 s cache. */
async function resolveViaDoh(hostname: string): Promise<string[]> {
  const key = hostname.toLowerCase();
  const cached = dnsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.addresses;

  const addresses: string[] = [];
  for (const type of ["A", "AAAA"]) {
    const response = await fetch(
      `${DOH_ENDPOINT}?name=${encodeURIComponent(key)}&type=${type}`,
      {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(DNS_TIMEOUT_MS),
      },
    );
    if (!response.ok) throw new Error(`DNS lookup failed with ${response.status}`);
    const body = (await response.json()) as {
      Answer?: { type?: number; data?: string }[];
    };
    for (const answer of body.Answer ?? []) {
      if (answer.type !== DOH_A && answer.type !== DOH_AAAA) continue;
      const data = answer.data?.trim();
      if (data) addresses.push(data);
    }
  }

  dnsCache.set(key, { expiresAt: Date.now() + DNS_CACHE_TTL_MS, addresses });
  if (dnsCache.size > DNS_CACHE_MAX_ENTRIES) {
    const now = Date.now();
    for (const [cacheKey, entry] of dnsCache) {
      if (entry.expiresAt <= now) dnsCache.delete(cacheKey);
    }
  }
  return addresses;
}

function isLiteralHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

export async function validateTargetUrl(
  raw: string,
  options: UrlGuardOptions = {},
): Promise<UrlGuardResult> {
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
  if (isLiteralHost(url.hostname)) {
    return { ok: true, url };
  }

  const resolve = options.resolve ?? resolveViaDoh;
  let addresses: string[];
  try {
    addresses = await resolve(url.hostname);
  } catch {
    return { ok: false, reason: "That address could not be verified right now." };
  }
  if (addresses.length === 0) {
    return { ok: false, reason: "That address could not be found." };
  }
  if (addresses.some((address) => isPrivateHostname(address))) {
    return { ok: false, reason: "That address is not reachable from the public internet." };
  }
  return { ok: true, url };
}

/** Re-validate a redirect target (resolved relative to `base`) before following it. */
export function validateRedirect(
  location: string,
  base: URL,
  options: UrlGuardOptions = {},
): Promise<UrlGuardResult> {
  let next: URL;
  try {
    next = new URL(location, base);
  } catch {
    return Promise.resolve({ ok: false, reason: "Redirect without a valid destination." });
  }
  return validateTargetUrl(next.toString(), options);
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
