import type { ReactNode } from "react";
import { Skeleton, Stat, cn } from "../../design";
import { useStats } from "./useStats";

export function formatWorkshopDate(iso: string | undefined): string {
  if (!iso) return "This Sunday, 7 PM IST";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "This Sunday, 7 PM IST";
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${formatted.replace(/\b(am|pm)\b/i, (match) => match.toUpperCase())} IST`;
}

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-b border-hairline">
      <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 lg:py-24">
        <h2 className="text-display-lg text-ink text-balance">{title}</h2>
        {lead ? <p className="mt-3 max-w-[60ch] text-body text-ink-muted">{lead}</p> : null}
        <div className="mt-8 lg:mt-10">{children}</div>
      </div>
    </section>
  );
}

const walkAway = [
  {
    title: "A live deployed link",
    body: "Your own URL on the internet, ready to send to anyone the same evening.",
    icon: (
      <>
        <path
          d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  {
    title: "A GitHub repo",
    body: "The full code, pushed to your own account so you can keep building after the workshop.",
    icon: (
      <path
        d="M9 5 4 12l5 7M15 5l5 7-5 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  {
    title: "A verifiable certificate",
    body: "Issued by NxtWave once you check in and ship your project. It links back to your live project.",
    icon: (
      <>
        <circle cx="12" cy="9" r="6" stroke="currentColor" strokeWidth="1.7" fill="none" />
        <path
          d="m8.5 14-1 7 4.5-2.5L16.5 21l-1-7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
];

export function WalkAway() {
  return (
    <Section
      id="walk-away"
      title="What you walk away with"
      lead="Not notes. Not slides. Three things you can show someone the same night."
    >
      <ul className="divide-y divide-hairline border-y border-hairline">
        {walkAway.map((item) => (
          <li key={item.title} className="grid grid-cols-[1.25rem_1fr] gap-4 py-5 sm:gap-5">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 h-5 w-5 text-ink-subtle">
              {item.icon}
            </svg>
            <div>
              <h3 className="text-title text-ink">{item.title}</h3>
              <p className="mt-1 max-w-[60ch] text-body-sm text-ink-muted">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const agenda = [
  { time: "0:00", title: "Welcome and setup", body: "Getting everyone into the room and ready." },
  {
    time: "0:05",
    title: "Your project takes shape",
    body: "The input: the one thing your project needs from the user.",
  },
  { time: "0:15", title: "Build the AI step", body: "Connect the AI API and shape its answer." },
  {
    time: "0:30",
    title: "Finish the output",
    body: "Turn the AI’s answer into something worth sharing, and test it.",
  },
  { time: "0:45", title: "Deploy it live", body: "Put it on the internet with a real URL." },
  {
    time: "0:55",
    title: "Share and next steps",
    body: "Your link, your certificate, and where to go from here.",
  },
];

export function Agenda() {
  return (
    <Section
      id="agenda"
      title="How the 60 minutes run"
      lead="One project, six steps, no dead time. The build starts at minute five."
    >
      <ol className="divide-y divide-hairline border-y border-hairline">
        {agenda.map((item) => (
          <li
            key={item.time}
            className="grid grid-cols-[3.5rem_1fr] gap-3 py-4 sm:grid-cols-[4.5rem_1fr]"
          >
            <span className="font-mono text-mono-data text-ink-subtle tabular-nums">
              {item.time}
            </span>
            <div>
              <p className="font-medium text-ink">{item.title}</p>
              <p className="mt-0.5 max-w-[60ch] text-body-sm text-ink-muted">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

const whoFor = [
  {
    title: "You’ve never coded",
    body: "Every line is shown and pasted. If you can use a browser and follow along, you can finish.",
  },
  {
    title: "You’re in your final years",
    body: "Any branch. If you’re building a placement portfolio, one deployed AI project beats ten certificates.",
  },
  {
    title: "You’ve built things before",
    body: "You’ll leave with a reusable AI-API pattern and a deployed app you can extend with your own idea.",
  },
];

export function WhoItsFor() {
  return (
    <Section
      id="who"
      title="Who it’s for"
      lead="Engineering students who want something real on their resume by Sunday night."
    >
      <dl className="divide-y divide-hairline border-y border-hairline">
        {whoFor.map((item) => (
          <div key={item.title} className="py-5">
            <dt className="font-medium text-ink">{item.title}</dt>
            <dd className="mt-1 max-w-[60ch] text-body-sm text-ink-muted">{item.body}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-body-sm text-ink-subtle">
        You&rsquo;ll need: a laptop, internet, and 60 minutes. Everything else is free.
      </p>
    </Section>
  );
}

export function LiveCounters() {
  const { data, isError } = useStats();
  const registrations = data?.registrations ?? null;
  const colleges = data?.colleges ?? null;
  const target = data?.target ?? 500;
  const percent =
    data && target > 0 ? Math.min(100, Math.round((data.registrations / target) * 100)) : 0;
  const empty = data !== undefined && data.registrations === 0;

  return (
    <Section
      id="numbers"
      title={empty ? "Seats are open" : "Students are already signing up"}
      lead={
        !data
          ? "Seats are free and capped. Live numbers update every minute."
          : empty
            ? `Next workshop: ${formatWorkshopDate(data.workshopStartIso)}. Be among the first from your campus.`
            : `Next workshop: ${formatWorkshopDate(data.workshopStartIso)}. Seats are free and capped.`
      }
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <Stat
          value={registrations === null ? <Skeleton className="w-24" lines={2} /> : registrations.toLocaleString("en-IN")}
          label="Registrations"
        />
        <Stat
          value={colleges === null ? <Skeleton className="w-24" lines={2} /> : colleges.toLocaleString("en-IN")}
          label="Colleges represented"
        />
      </div>
      {data ? (
        <div className="mt-8 max-w-xl">
          <div
            role="progressbar"
            aria-label="Seats filled"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={data.registrations}
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
          >
            <div className="h-full rounded-full bg-signal" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 font-mono text-mono-data text-ink-subtle tabular-nums">
            {data.registrations.toLocaleString("en-IN")} of {target.toLocaleString("en-IN")} seats
            filled
          </p>
        </div>
      ) : null}
      {isError ? (
        <p className="mt-6 text-body-sm text-ink-subtle">
          Live numbers are unavailable right now — registration still works.
        </p>
      ) : null}
    </Section>
  );
}

export function CoHosts() {
  return (
    <Section
      id="cohosts"
      title="Co-hosted with campus tech clubs"
      lead="Six tech clubs are joining as co-hosts. Logos land here as each one confirms."
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-hairline py-4 font-mono text-mono-data text-ink-subtle">
        <span>Co-host slots</span>
        <span aria-hidden="true" className="text-hairline-strong">
          ·
        </span>
        <span>Mention your club when you register</span>
        <span aria-hidden="true" className="text-hairline-strong">
          ·
        </span>
        <span>Open to all branches</span>
      </div>
    </Section>
  );
}

const faqs = [
  {
    question: "Is it free?",
    answer:
      "Yes. The whole 60-minute workshop is free, run by NxtWave. No card, no hidden fee, nothing to cancel later.",
  },
  {
    question: "Do I need coding experience?",
    answer:
      "No. Every step is shown on screen and you copy-paste as you go. If you can use a browser, you can follow along. If it doesn’t work on your laptop, we help you get unstuck live.",
  },
  {
    question: "What do I need?",
    answer:
      "A laptop with internet, and 60 minutes on Sunday evening. We’ll show you how to get a free AI API key in the first five minutes — no downloads to install beforehand.",
  },
  {
    question: "Will there be a sales pitch?",
    answer:
      "No. It’s a build session: one project, built and deployed in 60 minutes. At the end we’ll tell you what NxtWave offers next if you want to keep going — but nobody is selling from the stage.",
  },
];

export function Faq() {
  return (
    <Section id="faq" title="Questions students ask">
      <div className="border-t border-hairline">
        {faqs.map((faq) => (
          <details key={faq.question} className="group border-b border-hairline">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-medium text-ink marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal">
              {faq.question}
              <span
                aria-hidden="true"
                className={cn(
                  "shrink-0 text-ink-subtle transition-transform duration-[var(--dur-ui)] ease-[var(--ease-out)] group-open:rotate-45",
                  "motion-reduce:transition-none",
                )}
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                  <path
                    d="M8 2v12M2 8h12"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </summary>
            <p className="max-w-[65ch] pb-4 text-body-sm text-ink-muted">{faq.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
