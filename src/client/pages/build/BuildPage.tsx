/**
 * /build — architecture, module map, and the decision log rendered from
 * DECISIONS.md at build time (Vite ?raw import). No dependency beyond React.
 * Visual language: inline hairline SVG with signal accents, hairline data
 * rows, and the asked → AI suggested → rejected block kept intact.
 */
import type { ReactNode } from "react";
import decisionsRaw from "../../../../DECISIONS.md?raw";

/* --------------------------------- helpers ---------------------------------- */

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-medium text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded-[6px] border border-hairline bg-surface-1 px-1.5 py-0.5 font-mono text-[12px] text-ink-muted [overflow-wrap:anywhere]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/* ----------------------------- decision parsing ----------------------------- */

interface DecisionField {
  label: string;
  value: string;
}
interface DecisionEntry {
  title: string;
  fields: DecisionField[];
  notes: string[];
}
interface DecisionGroup {
  title: string;
  entries: DecisionEntry[];
  notes: string[];
}
interface ParsedDecisions {
  preamble: string;
  groups: DecisionGroup[];
}

function parseDecisions(markdown: string): ParsedDecisions {
  const groups: DecisionGroup[] = [];
  const preambleLines: string[] = [];
  let group: DecisionGroup | null = null;
  let entry: DecisionEntry | null = null;
  let field: DecisionField | null = null;

  const flushField = () => {
    if (field && entry) entry.fields.push(field);
    field = null;
  };
  const flushEntry = () => {
    flushField();
    if (entry && group) group.entries.push(entry);
    entry = null;
  };
  const flushGroup = () => {
    flushEntry();
    if (group) groups.push(group);
    group = null;
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.startsWith("# ")) continue;
    if (line.startsWith("## ")) {
      flushGroup();
      group = { title: line.slice(3), entries: [], notes: [] };
      continue;
    }
    if (line.startsWith("### ")) {
      if (!group) group = { title: "", entries: [], notes: [] };
      flushEntry();
      entry = { title: line.slice(4), fields: [], notes: [] };
      continue;
    }
    if (line.trim() === "") {
      flushField();
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^(\d+)\.\s+(.*)$/.exec(line);
    if (bullet) {
      const content = bullet[1];
      const labelled = /^\*\*([^:*]+):?\*\*:?\s*(.*)$/.exec(content);
      if (labelled && entry) {
        flushField();
        field = { label: labelled[1], value: labelled[2] };
      } else if (entry) {
        flushField();
        entry.notes.push(content);
      } else if (group) {
        group.notes.push(content);
      } else {
        preambleLines.push(content);
      }
      continue;
    }
    if (numbered) {
      const content = `${numbered[1]}. ${numbered[2]}`;
      if (entry) entry.notes.push(content);
      else if (group) group.notes.push(content);
      continue;
    }
    if (field) field.value += ` ${line.trim()}`;
    else if (entry) entry.notes.push(line.trim());
    else if (group) group.notes.push(line.trim());
    else preambleLines.push(line.trim());
  }
  flushGroup();
  return { preamble: preambleLines.join(" "), groups };
}

/* ------------------------------- architecture ------------------------------- */

const LABEL = "fill-ink text-[13px] font-semibold";
const BODY = "fill-ink-muted text-[11.5px]";
const MUTED = "fill-ink-subtle text-[11px]";
const MONO_LABEL = "fill-ink-subtle font-mono text-[10.5px]";

function DesktopArchitecture() {
  return (
    <svg
      viewBox="0 0 960 420"
      role="img"
      aria-labelledby="arch-title arch-desc"
      className="hidden h-auto w-full md:block"
    >
      <title id="arch-title">Ship60 architecture</title>
      <desc id="arch-desc">
        One Cloudflare Worker serves the React SPA and the Hono API. The Worker binds D1, KV, a
        Durable Object and Workers AI; Turnstile guards registration and a Cron Trigger schedules
        reminders.
      </desc>
      <defs>
        <marker id="arch-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" className="fill-hairline-strong" />
        </marker>
        <marker
          id="arch-arrow-signal"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path d="M0,0 L7,3.5 L0,7 z" className="fill-signal" />
        </marker>
      </defs>

      <rect x="20" y="36" width="280" height="170" rx="14" className="fill-surface-1 stroke-hairline" strokeWidth="1" />
      <text x="40" y="66" className={LABEL}>
        Student phone · React SPA
      </text>
      <text x="40" y="92" className={BODY}>
        landing · AI preview · register
      </text>
      <text x="40" y="112" className={BODY}>
        launchpad · live · submit · cert
      </text>
      <text x="40" y="132" className={BODY}>
        390×844 first, in-app browsers
      </text>
      <text x="40" y="164" className={MONO_LABEL}>
        static assets, same origin as the API
      </text>

      <rect x="390" y="36" width="300" height="170" rx="14" className="fill-surface-1 stroke-hairline" strokeWidth="1" />
      <text x="410" y="66" className={LABEL}>
        Cloudflare Worker
      </text>
      <text x="410" y="92" className={BODY}>
        Hono API + static assets
      </text>
      <text x="410" y="112" className={BODY}>
        zod validation · rate limits · Turnstile
      </text>
      <text x="410" y="132" className={BODY}>
        security headers · no CORS surface
      </text>
      <text x="410" y="164" className={MONO_LABEL}>
        public · referral · ideas · og · admin
      </text>
      <text x="410" y="180" className={MONO_LABEL}>
        live · submissions · cron
      </text>

      {[
        { y: 36, title: "D1", detail: "system of record" },
        { y: 100, title: "KV", detail: "ideas · leaderboards (60 s)" },
        { y: 164, title: "Durable Object", detail: "LiveRoom · WS hibernation" },
        { y: 228, title: "Workers AI", detail: "llama-3.1-8b · llama-3.3-70b" },
      ].map((binding) => (
        <g key={binding.title}>
          <rect
            x="720"
            y={binding.y}
            width="220"
            height="48"
            rx="10"
            className="fill-surface-1 stroke-hairline"
            strokeWidth="1"
          />
          <text x="736" y={binding.y + 20} className="fill-ink text-[12px] font-medium">
            {binding.title}
          </text>
          <text x="736" y={binding.y + 36} className={MUTED}>
            {binding.detail}
          </text>
        </g>
      ))}

      <line x1="304" y1="84" x2="386" y2="84" className="stroke-signal" strokeWidth="1.5" markerEnd="url(#arch-arrow-signal)" />
      <text x="306" y="76" className="fill-signal font-mono text-[9.5px]">
        fetch JSON
      </text>
      <line x1="390" y1="132" x2="308" y2="132" className="stroke-hairline-strong" strokeWidth="1" markerEnd="url(#arch-arrow)" />
      <text x="306" y="150" className="fill-ink-subtle font-mono text-[9.5px]">
        SPA assets
      </text>

      <line x1="690" y1="126" x2="700" y2="126" className="stroke-hairline-strong" strokeWidth="1" />
      <line x1="700" y1="60" x2="700" y2="252" className="stroke-hairline-strong" strokeWidth="1" />
      {[60, 124, 188, 252].map((y) => (
        <line
          key={y}
          x1="700"
          y1={y}
          x2="716"
          y2={y}
          className="stroke-hairline-strong"
          strokeWidth="1"
          markerEnd="url(#arch-arrow)"
        />
      ))}

      <rect x="20" y="290" width="460" height="96" rx="14" className="fill-surface-1 stroke-hairline" strokeWidth="1" />
      <text x="40" y="320" className={LABEL}>
        Turnstile · registration
      </text>
      <text x="40" y="342" className={BODY}>
        dev keys always verify locally;
      </text>
      <text x="40" y="360" className={BODY}>
        real verification activates with the secret.
      </text>

      <rect x="500" y="290" width="440" height="96" rx="14" className="fill-surface-1 stroke-hairline" strokeWidth="1" />
      <text x="520" y="320" className={LABEL}>
        Cron Trigger · every 15 min
      </text>
      <text x="520" y="342" className={BODY}>
        reminders D-1, 2 h and 15 min before the workshop;
      </text>
      <text x="520" y="360" className={BODY}>
        Resend email when configured, admin copy-to-paste otherwise.
      </text>

      <line x1="520" y1="206" x2="520" y2="286" className="stroke-hairline-strong" strokeWidth="1" markerEnd="url(#arch-arrow)" />
      <line x1="250" y1="206" x2="250" y2="286" className="stroke-hairline-strong" strokeWidth="1" markerEnd="url(#arch-arrow)" />
      <text x="526" y="250" className="fill-ink-subtle font-mono text-[10px]">
        guards + schedules
      </text>
    </svg>
  );
}

function MobileArchitecture() {
  const bindings = [
    { title: "D1", detail: "system of record" },
    { title: "KV", detail: "ideas · leaderboards (60 s)" },
    { title: "Durable Object", detail: "LiveRoom · WS hibernation" },
    { title: "Workers AI", detail: "llama-3.1-8b · llama-3.3-70b" },
  ];
  return (
    <svg
      viewBox="0 0 360 640"
      role="img"
      aria-label="Ship60 architecture on one Worker with D1, KV, a Durable Object and Workers AI"
      className="h-auto w-full md:hidden"
    >
      <defs>
        <marker id="m-arch-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" className="fill-hairline-strong" />
        </marker>
        <marker
          id="m-arch-arrow-signal"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path d="M0,0 L7,3.5 L0,7 z" className="fill-signal" />
        </marker>
      </defs>
      <rect x="12" y="16" width="336" height="104" rx="14" className="fill-surface-1 stroke-hairline" strokeWidth="1" />
      <text x="28" y="44" className={LABEL}>
        Student phone · React SPA
      </text>
      <text x="28" y="68" className={BODY}>
        landing · preview · register
      </text>
      <text x="28" y="86" className={BODY}>
        launchpad · live · submit · cert
      </text>
      <text x="28" y="106" className={MONO_LABEL}>
        390×844 first, in-app browsers
      </text>

      <line x1="180" y1="120" x2="180" y2="170" className="stroke-signal" strokeWidth="1.5" markerEnd="url(#m-arch-arrow-signal)" />
      <text x="190" y="148" className="fill-signal font-mono text-[10px]">
        fetch JSON · SPA assets
      </text>

      <rect x="12" y="174" width="336" height="120" rx="14" className="fill-surface-1 stroke-hairline" strokeWidth="1" />
      <text x="28" y="202" className={LABEL}>
        Cloudflare Worker
      </text>
      <text x="28" y="226" className={BODY}>
        Hono API + static assets, one origin
      </text>
      <text x="28" y="244" className={BODY}>
        zod validation · rate limits · Turnstile
      </text>
      <text x="28" y="262" className={MONO_LABEL}>
        public · referral · ideas · og
      </text>
      <text x="28" y="278" className={MONO_LABEL}>
        admin · live · submissions · cron
      </text>

      <line x1="180" y1="294" x2="180" y2="330" className="stroke-hairline-strong" strokeWidth="1" markerEnd="url(#m-arch-arrow)" />

      {bindings.map((binding, index) => {
        const y = 334 + index * 74;
        return (
          <g key={binding.title}>
            <rect x="12" y={y} width="336" height="62" rx="10" className="fill-surface-1 stroke-hairline" strokeWidth="1" />
            <text x="28" y={y + 26} className="fill-ink text-[12.5px] font-medium">
              {binding.title}
            </text>
            <text x="28" y={y + 45} className={MUTED}>
              {binding.detail}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------- AI decisions -------------------------------- */

const AI_NOTES = [
  {
    id: "P0.2",
    title: "Vitest on Workers — the package named in the brief had a successor",
    asked: "Which Vitest integration to use for the Workers pool.",
    suggested: "The package named in the PRD, @cloudflare/vitest-pool-workers.",
    changed:
      "Current docs describe @cloudflare/vitest-plugin with cloudflareTest(), so that is what shipped.",
    rejected:
      "The old pool package — it would pin Vitest 4 while the template ships Vitest 4.1.",
  },
  {
    id: "P0.5",
    title: "Workers AI model ids — verify the catalog, do not trust the brief",
    asked: "Which OpenAI-compatible model ids to call on Workers AI.",
    suggested: "@cf/meta/llama-3.1-8b-instruct from the PRD.",
    changed:
      "llama-3.1-8b-instruct-fast for ideas and the daily brief, and llama-3.3-70b-instruct-fp8-fast for the evaluator, after checking the October 2026 catalog.",
    rejected:
      "Larger Llama 4 models — more neurons per call with no measured quality need for a three-field JSON card.",
  },
  {
    id: "WS4.1",
    title: "Share-card fonts — inline subset WOFF instead of a runtime fetch",
    asked: "How to render Archivo inside OG PNGs in a Worker.",
    suggested: "loadGoogleFont() at render time, the common workers-og example.",
    changed:
      "Inline the base64 subset WOFF in src/worker/routes/og-font.ts, decoded once per isolate.",
    rejected:
      "The runtime Google Fonts fetch (network dependency on every render) and an ASSETS binding that did not exist yet.",
  },
] as const;

function AiDecisionNotes() {
  return (
    <div>
      {AI_NOTES.map((note) => (
        <article
          key={note.id}
          className="grid gap-5 border-t border-hairline py-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-10"
        >
          <div>
            <p className="font-mono text-[11px] text-ink-subtle">{note.id}</p>
            <h3 className="mt-1.5 text-[15px] font-medium leading-snug text-ink [text-wrap:balance]">
              {note.title}
            </h3>
          </div>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[11px] text-ink-subtle">We asked AI</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-ink-muted">{note.asked}</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] text-ink-subtle">AI suggested</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-ink-muted">{note.suggested}</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] text-ink-subtle">What changed</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-ink-muted">{note.changed}</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] text-danger">Rejected</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-ink-muted">{note.rejected}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

/* --------------------------------- modules ---------------------------------- */

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

function ModuleRows() {
  return (
    <>
      <dl className="md:hidden">
        {MODULES.map((row) => (
          <div key={row.module} className="border-b border-hairline py-3 last:border-b-0">
            <dt className="text-[13px] font-medium text-ink">{row.module}</dt>
            <dd className="mt-1.5">
              <p className="font-mono text-[11px] text-signal">{row.where}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{row.what}</p>
              <p className="mt-1 font-mono text-[10px] text-ink-subtle">{row.ws}</p>
            </dd>
          </div>
        ))}
      </dl>
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {["Module", "Where", "What it does", "WS"].map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="border-b border-hairline px-4 pb-2 text-[11px] font-medium text-ink-subtle first:pl-0 last:pr-0"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((row) => (
              <tr key={row.module} className="border-b border-hairline last:border-b-0 hover:bg-surface-1">
                <td className="px-4 py-2.5 text-[13px] font-medium text-ink first:pl-0">
                  {row.module}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-signal">
                  {row.where}
                </td>
                <td className="px-4 py-2.5 text-[13px] text-ink-muted">{row.what}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-ink-subtle last:pr-0">
                  {row.ws}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ------------------------------- decision log -------------------------------- */

function DecisionEntryRow({ entry }: { entry: DecisionEntry }) {
  return (
    <article className="grid gap-2 border-b border-hairline py-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-10">
      <h4 className="text-[13px] font-medium leading-snug text-ink [text-wrap:balance]">
        {renderInline(entry.title)}
      </h4>
      <div>
        {entry.fields.length > 0 ? (
          <dl className="space-y-2">
            {entry.fields.map((field) => (
              <div
                key={field.label}
                className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 sm:grid-cols-[88px_minmax(0,1fr)]"
              >
                <dt className="pt-0.5 font-mono text-[11px] text-ink-subtle">{field.label}</dt>
                <dd className="text-[13px] leading-relaxed text-ink-muted">
                  {renderInline(field.value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {entry.notes.length > 0 ? (
          <div className={entry.fields.length > 0 ? "mt-2 space-y-2" : "space-y-2"}>
            {entry.notes.map((note, index) => (
              <p key={index} className="text-[13px] leading-relaxed text-ink-muted">
                {renderInline(note)}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function DecisionLog() {
  const { preamble, groups } = parseDecisions(decisionsRaw);
  return (
    <div className="mt-8">
      {preamble ? (
        <p className="border-b border-hairline pb-4 text-[12px] leading-relaxed text-ink-subtle">
          {preamble}
        </p>
      ) : null}
      <div className="space-y-12 pt-8">
        {groups.map((group) => (
          <section key={group.title}>
            <h3 className="border-b border-hairline-strong pb-2 font-mono text-[11px] text-ink-subtle">
              {group.title}
            </h3>
            {group.notes.map((note, index) => (
              <p
                key={index}
                className="border-b border-hairline py-3 text-[13px] leading-relaxed text-ink-muted"
              >
                {renderInline(note)}
              </p>
            ))}
            {group.entries.map((entry) => (
              <DecisionEntryRow key={entry.title} entry={entry} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------- page ----------------------------------- */

function Fact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-ink-subtle">{label}</dt>
      <dd className="mt-1 font-mono text-[15px] font-medium leading-tight text-ink">{value}</dd>
      <dd className="mt-1 text-[12px] leading-snug text-ink-muted">{detail}</dd>
    </div>
  );
}

export default function BuildPage() {
  return (
    <main className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto max-w-[1120px] px-4 pb-24 sm:px-6">
        <header className="flex items-center gap-3 py-5">
          <p className="flex min-w-0 items-baseline gap-2">
            <a href="/" className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
              Ship60
            </a>
            <span className="truncate font-mono text-[11px] text-ink-subtle">/build notes</span>
          </p>
          <a
            href="/plan"
            className="ml-auto shrink-0 font-mono text-[11px] text-info underline decoration-hairline-strong underline-offset-4 hover:decoration-current"
          >
            /plan →
          </a>
        </header>

        <h1 className="mt-6 max-w-[18ch] text-[clamp(2.25rem,6vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink [text-wrap:balance]">
          How it was built
        </h1>
        <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-ink-muted">
          One Worker, one origin, free-tier only. This page is generated at build time: the decision
          log below is imported straight from{" "}
          <code className="rounded-[6px] border border-hairline bg-surface-1 px-1.5 py-0.5 font-mono text-[13px] text-ink-muted">
            DECISIONS.md
          </code>{" "}
          with Vite&rsquo;s raw import, so it can never drift from the repository.
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-hairline pt-6 sm:grid-cols-4">
          <Fact label="Runtime" value="1 Worker" detail="SPA + API, same origin" />
          <Fact label="Data" value="D1 + KV" detail="system of record + cache" />
          <Fact label="Realtime" value="Durable Object" detail="LiveRoom, WS hibernation" />
          <Fact label="Model calls" value="Workers AI" detail="ideas · evaluator · brief" />
        </dl>

        <section className="mt-14">
          <h2 className="text-[clamp(1.5rem,3.4vw,2rem)] font-semibold tracking-[-0.025em] text-ink">
            Architecture
          </h2>
          <p className="mt-2 max-w-[72ch] text-[14px] leading-relaxed text-ink-muted">
            The SPA and the API ship from the same Worker (Workers Static Assets). D1 is the system
            of record; KV caches ideas and leaderboards; a Durable Object runs the live room;
            Workers AI generates ideas, evaluations and the daily brief.
          </p>
          <div className="mt-6 rounded-panel border border-hairline bg-canvas p-3 sm:p-5">
            <DesktopArchitecture />
            <MobileArchitecture />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-[clamp(1.5rem,3.4vw,2rem)] font-semibold tracking-[-0.025em] text-ink">
            What we asked AI, what it suggested, what we rejected
          </h2>
          <p className="mt-2 max-w-[72ch] text-[14px] leading-relaxed text-ink-muted">
            Three build-time decisions, curated from the full log below. Each one is a real
            alternative that was considered and then changed or rejected.
          </p>
          <div className="mt-4">
            <AiDecisionNotes />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-[clamp(1.5rem,3.4vw,2rem)] font-semibold tracking-[-0.025em] text-ink">
            What each module does
          </h2>
          <div className="mt-4 border-t border-hairline-strong pt-3">
            <ModuleRows />
          </div>
        </section>

        <section id="decision-log" className="mt-14 scroll-mt-6">
          <h2 className="text-[clamp(1.5rem,3.4vw,2rem)] font-semibold tracking-[-0.025em] text-ink">
            Decision log
          </h2>
          <p className="mt-2 max-w-[72ch] text-[14px] leading-relaxed text-ink-muted">
            Options considered, the choice, why, and what was rejected — every non-obvious call
            from <span className="font-mono text-[13px]">DECISIONS.md</span>, live.
          </p>
          <DecisionLog />
        </section>

        <footer className="mt-16 border-t border-hairline pt-5 text-[12px] text-ink-subtle">
          Ship60 demo build notes. Simulated data is generated by{" "}
          <code className="font-mono text-[12px]">scripts/seed.ts</code> and always labelled
          &ldquo;Simulated data&rdquo;.{" "}
          <a href="/" className="underline underline-offset-4 hover:text-ink">
            Home
          </a>{" "}
          ·{" "}
          <a href="/plan" className="underline underline-offset-4 hover:text-ink">
            /plan
          </a>{" "}
          ·{" "}
          <a href="/leaderboard" className="underline underline-offset-4 hover:text-ink">
            /leaderboard
          </a>
        </footer>
      </div>
    </main>
  );
}
