/**
 * WS8 — /build: architecture, module map, and the decision log rendered from
 * DECISIONS.md at build time (Vite ?raw import). The markdown renderer is local
 * and deliberately tiny; no new dependencies.
 */
import type { ReactNode } from "react";
import decisionsRaw from "../../../../DECISIONS.md?raw";

/* ------------------------------ tiny markdown ------------------------------ */

type Block =
  | { kind: "h"; level: 1 | 2 | 3; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] };

function parseMarkdown(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "p", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ kind: "ul", items: list });
      list = [];
    }
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "h", level: heading[1].length as 1 | 2 | 3, text: heading[2] });
    } else if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      list.push(line.replace(/^[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-[#2E333B]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-[#F4F7FD] px-1 py-0.5 text-[0.85em] text-[#1F3A93]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function Markdown({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.kind === "h") {
          if (block.level === 1) {
            return (
              <h2
                key={index}
                className="mt-6 border-b border-[#DDE5F2] pb-1 text-xl font-bold text-[#1F3A93]"
              >
                {renderInline(block.text)}
              </h2>
            );
          }
          if (block.level === 2) {
            return (
              <h3 key={index} className="mt-5 text-lg font-semibold text-[#2E333B]">
                {renderInline(block.text)}
              </h3>
            );
          }
          return (
            <h4
              key={index}
              className="mt-4 text-sm font-semibold tracking-wide text-[#1F3A93] uppercase"
            >
              {renderInline(block.text)}
            </h4>
          );
        }
        if (block.kind === "ul") {
          return (
            <ul
              key={index}
              className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#2E333B]"
            >
              {block.items.map((item) => (
                <li key={item}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="text-sm leading-relaxed text-[#2E333B]">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

/* ------------------------------- architecture ------------------------------ */

function ArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 960 560"
      role="img"
      aria-labelledby="arch-title arch-desc"
      className="h-auto w-full"
    >
      <title id="arch-title">Ship60 architecture</title>
      <desc id="arch-desc">
        One Cloudflare Worker serves the React SPA and the Hono API. The Worker binds D1, KV,
        Durable Objects, Workers AI, Turnstile and a Cron Trigger.
      </desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#6E7BA6" />
        </marker>
      </defs>

      {/* Client */}
      <rect
        x="24"
        y="40"
        width="360"
        height="180"
        rx="8"
        fill="#F4F7FD"
        stroke="#1F3A93"
        strokeWidth="1.5"
      />
      <text x="44" y="70" fontSize="15" fontWeight="700" fill="#1F3A93">
        Student phone · React SPA
      </text>
      <text x="44" y="94" fontSize="12" fill="#2E333B">
        Landing + AI preview · Launchpad · Leaderboard
      </text>
      <text x="44" y="114" fontSize="12" fill="#2E333B">
        Ambassador kit · Live room · Submit · Cert
      </text>
      <text x="44" y="134" fontSize="12" fill="#2E333B">
        /plan deck · /build notes
      </text>
      <text x="44" y="166" fontSize="11" fill="#6E7BA6">
        Static Assets with SPA fallback.
      </text>
      <text x="44" y="184" fontSize="11" fill="#6E7BA6">
        Works in WhatsApp / Instagram in-app browsers.
      </text>
      <text x="44" y="202" fontSize="11" fill="#6E7BA6">
        Tailwind v4 · TanStack Query · Recharts (admin only)
      </text>

      {/* Worker */}
      <rect
        x="470"
        y="40"
        width="466"
        height="180"
        rx="8"
        fill="#F4F7FD"
        stroke="#1F3A93"
        strokeWidth="1.5"
      />
      <text x="490" y="70" fontSize="15" fontWeight="700" fill="#1F3A93">
        One Cloudflare Worker · Hono API
      </text>
      <text x="490" y="96" fontSize="12" fill="#2E333B">
        routes: public · referral · ideas · og · admin · live · submissions
      </text>
      <text x="490" y="116" fontSize="12" fill="#2E333B">
        lib: db · auth · ratelimit · ids · events · ai
      </text>
      <text x="490" y="136" fontSize="12" fill="#2E333B">
        zod validation · rate limits · Turnstile · security headers
      </text>
      <text x="490" y="166" fontSize="11" fill="#6E7BA6">
        Durable Object: LiveRoom (WebSocket hibernation, SQLite)
      </text>
      <text x="490" y="184" fontSize="11" fill="#6E7BA6">
        OG images generated in-Worker with workers-og (PNG)
      </text>
      <text x="490" y="202" fontSize="11" fill="#6E7BA6">
        Same origin for SPA and API — cookies, no CORS surface
      </text>

      {/* Client -> Worker */}
      <line
        x1="384"
        y1="100"
        x2="470"
        y2="100"
        stroke="#6E7BA6"
        strokeWidth="2"
        markerEnd="url(#arrow)"
      />
      <text x="392" y="92" fontSize="10" fill="#6E7BA6">
        fetch JSON
      </text>
      <line
        x1="470"
        y1="130"
        x2="384"
        y2="130"
        stroke="#6E7BA6"
        strokeWidth="2"
        markerEnd="url(#arrow)"
      />
      <text x="392" y="148" fontSize="10" fill="#6E7BA6">
        SPA assets
      </text>

      {/* Bindings */}
      {[
        {
          x: 24,
          title: "D1 · ship60-db",
          lines: ["system of record", "users, referrals,", "events, checkins,", "submissions"],
        },
        {
          x: 258,
          title: "KV · CACHE",
          lines: ["idea cache (144 keys)", "leaderboard 60 s", "stats 60 s", "rate counters"],
        },
        {
          x: 492,
          title: "Durable Object",
          lines: ["LiveRoom", "1 per workshop", "WebSocket hibernation", "check-in → qualify"],
        },
        {
          x: 726,
          title: "Workers AI",
          lines: ["ideas + brief:", "llama-3.1-8b-fast", "evaluator:", "llama-3.3-70b-fp8-fast"],
        },
      ].map((binding) => (
        <g key={binding.title}>
          <rect
            x={binding.x}
            y="310"
            width="210"
            height="120"
            rx="6"
            fill="#FFFFFF"
            stroke="#DDE5F2"
            strokeWidth="1.5"
          />
          <text x={binding.x + 14} y="336" fontSize="13" fontWeight="700" fill="#1F3A93">
            {binding.title}
          </text>
          {binding.lines.map((line, lineIndex) => (
            <text
              key={line}
              x={binding.x + 14}
              y={358 + lineIndex * 16}
              fontSize="11"
              fill="#2E333B"
            >
              {line}
            </text>
          ))}
          <line
            x1={binding.x + 105}
            y1="220"
            x2={binding.x + 105}
            y2="310"
            stroke="#6E7BA6"
            strokeWidth="1.5"
            markerEnd="url(#arrow)"
          />
        </g>
      ))}

      {/* Turnstile + Cron */}
      <rect
        x="24"
        y="466"
        width="360"
        height="70"
        rx="6"
        fill="#FFFFFF"
        stroke="#DDE5F2"
        strokeWidth="1.5"
      />
      <text x="44" y="492" fontSize="13" fontWeight="700" fill="#1F3A93">
        Turnstile (registration)
      </text>
      <text x="44" y="514" fontSize="11" fill="#2E333B">
        Dev keys always verify; real verification activates with the secret.
      </text>

      <rect
        x="470"
        y="466"
        width="466"
        height="70"
        rx="6"
        fill="#FFFFFF"
        stroke="#DDE5F2"
        strokeWidth="1.5"
      />
      <text x="490" y="492" fontSize="13" fontWeight="700" fill="#1F3A93">
        Cron Trigger · every 15 min
      </text>
      <text x="490" y="514" fontSize="11" fill="#2E333B">
        Reminders D-1, 2 h and 15 min before; Resend email when the secret exists, otherwise admin
        copy-to-paste.
      </text>
    </svg>
  );
}

/* --------------------------------- modules --------------------------------- */

const MODULES = [
  {
    module: "M1 Landing + preview + register",
    where: "/",
    what: "AI project card, inline registration, Turnstile, live counter",
    ws: "WS1/2/3",
  },
  {
    module: "M2 Referral + fraud guards",
    where: "/r/:code",
    what: "ref codes, first-touch cookie, flags queue, self-referral guard",
    ws: "WS1",
  },
  {
    module: "M3 Launchpad",
    where: "/me",
    what: "seat ticket, referral link, tiers, ranks, calendar",
    ws: "WS4",
  },
  {
    module: "M4 Share cards",
    where: "/og/:code.png",
    what: "PNG feed and story cards, cached 1 h",
    ws: "WS4",
  },
  {
    module: "M5 Leaderboards",
    where: "/leaderboard",
    what: "students and colleges, 60 s cache",
    ws: "WS1/4",
  },
  {
    module: "M6 Admin war room",
    where: "/admin",
    what: "pacing, funnel, channels, flags, daily brief, CSV",
    ws: "WS5",
  },
  {
    module: "M7 Ambassador kit",
    where: "/ambassador/:code",
    what: "link, 3 message variants, stats, checklist",
    ws: "WS4",
  },
  {
    module: "M8 Live workshop",
    where: "/live",
    what: "check-in qualifies referrals, polls, quiz, help queue",
    ws: "WS6",
  },
  {
    module: "M9 AI evaluator",
    where: "/submit",
    what: "rubric score, prompt-injection-safe, fallback to manual",
    ws: "WS7",
  },
  {
    module: "M10 Certificates",
    where: "/cert/:id",
    what: "checked in + submitted, unguessable id",
    ws: "WS7",
  },
  {
    module: "M11 Reminders",
    where: "cron */15",
    what: "email when configured, admin fallback otherwise",
    ws: "WS7",
  },
  {
    module: "M12 /plan + /build",
    where: "/plan, /build",
    what: "this deck and this page, numbers from plan.ts",
    ws: "WS8",
  },
  {
    module: "M13 Simulation + seed",
    where: "scripts/seed.ts",
    what: "deterministic demo data, is_simulated = 1 everywhere",
    ws: "WS8",
  },
];

export default function BuildPage() {
  return (
    <main className="min-h-screen bg-[#FBFCFE] px-4 py-8 text-[#2E333B]">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold tracking-widest text-[#1F3A93] uppercase">
          Ship60 · /build
        </p>
        <h1 className="mt-1 text-3xl font-bold">How it was built</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#2E333B]">
          One Worker, one origin, free-tier only. This page is generated at build time: the decision
          log below is imported straight from <code>DECISIONS.md</code> with Vite&apos;s{" "}
          <code>?raw</code> import, so it can never drift from the repository.{" "}
          <a href="/plan" className="font-medium text-[#1F3A93] underline">
            See the 5-slide growth plan →
          </a>
        </p>

        <section className="mt-8 rounded border border-[#DDE5F2] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[#1F3A93]">Architecture</h2>
          <p className="mt-1 text-sm text-[#2E333B]">
            The SPA and the API ship from the same Worker (Workers Static Assets). D1 is the system
            of record; KV caches ideas and leaderboards; a Durable Object runs the live room;
            Workers AI generates ideas, evaluations and the daily brief.
          </p>
          <div className="mt-4 overflow-x-auto">
            <ArchitectureDiagram />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-[#1F3A93]">What each module does</h2>
          <div className="mt-3 overflow-x-auto rounded border border-[#DDE5F2] bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#DDE5F2] text-xs tracking-wide text-[#1F3A93] uppercase">
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Where</th>
                  <th className="px-4 py-3">What it does</th>
                  <th className="px-4 py-3">WS</th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map((row) => (
                  <tr key={row.module} className="border-b border-[#DDE5F2] last:border-b-0">
                    <td className="px-4 py-2.5 font-medium text-[#2E333B]">{row.module}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <code className="text-[#1F3A93]">{row.where}</code>
                    </td>
                    <td className="px-4 py-2.5 text-[#2E333B]">{row.what}</td>
                    <td className="px-4 py-2.5 text-[#6E7BA6]">{row.ws}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded border border-[#DDE5F2] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-[#1F3A93]">Decision log (from DECISIONS.md)</h2>
          <p className="mt-1 text-sm text-[#6E7BA6]">
            Options considered, the choice, why, and what was rejected — a live view of the file,
            not a copy.
          </p>
          <div className="mt-4">
            <Markdown markdown={decisionsRaw} />
          </div>
        </section>

        <footer className="mt-10 border-t border-[#DDE5F2] pt-4 text-xs text-[#6E7BA6]">
          Ship60 demo build notes. Simulated data is generated by <code>scripts/seed.ts</code> and
          always labelled &quot;Simulated data&quot;.{" "}
          <a href="/" className="underline">
            Home
          </a>{" "}
          ·{" "}
          <a href="/plan" className="underline">
            /plan
          </a>{" "}
          ·{" "}
          <a href="/leaderboard" className="underline">
            /leaderboard
          </a>
        </footer>
      </div>
    </main>
  );
}
