/**
 * WS7 — Public certificate verification (PRD M11).
 * Flight Deck restyle (DESIGN.md §8); fetch behavior and copy unchanged.
 */
import { useQuery } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { Link, useParams } from "react-router";
import type { CertificateResponse } from "../../../shared/contracts";
import { SimulatedBadge, buttonClass, cn } from "../../design";
import { CheckIcon } from "../me/ui";

async function fetchCertificate(id: string): Promise<CertificateResponse | null> {
  const response = await fetch(`/api/submissions/cert/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not verify this certificate right now.");
  return (await response.json()) as CertificateResponse;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(
    date,
  );
}

function CertShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto w-full max-w-xl px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-10">
        {children}
      </div>
    </main>
  );
}

export default function CertPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError } = useQuery({
    queryKey: ["certificate", id],
    queryFn: () => fetchCertificate(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });

  if (isPending) {
    return (
      <CertShell>
        <p className="text-body-sm text-ink-muted">Verifying certificate…</p>
      </CertShell>
    );
  }
  if (isError) {
    return (
      <CertShell>
        <h1 className="font-display text-display-lg text-ink text-balance">
          Could not verify this certificate
        </h1>
        <p className="mt-3 text-body-sm leading-relaxed text-ink-muted">
          Please try again in a moment.
        </p>
      </CertShell>
    );
  }
  if (!data) {
    return (
      <CertShell>
        <h1 className="font-display text-display-lg text-ink text-balance">
          No certificate with that id
        </h1>
        <p className="mt-3 text-body-sm leading-relaxed text-ink-muted">
          Check the link, or ask the student to share their certificate id again.
        </p>
        <Link
          to="/"
          className="mt-5 inline-block rounded-sm text-body-sm text-ink-muted underline decoration-hairline-strong underline-offset-4 transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          Go to the workshop page
        </Link>
      </CertShell>
    );
  }

  const shareText = `${data.name} completed NxtWave's 60-minute AI workshop${
    data.projectTitle ? ` and built ${data.projectTitle}` : ""
  }. Verify: ${window.location.href}`;

  return (
    <CertShell>
      <section className="rounded-panel border border-hairline bg-surface-1">
        <div className="px-5 py-6 sm:px-6">
          <h1 className="font-display text-display-lg text-ink text-balance">
            Certificate of completion
          </h1>
          <p className="mt-6 text-title text-ink">{data.name}</p>
          {data.projectTitle ? (
            <p className="mt-1 text-body-sm leading-relaxed text-ink-muted">
              built <span className="font-medium text-ink">{data.projectTitle}</span>
            </p>
          ) : null}
          <dl className="mt-6 divide-y divide-hairline border-y border-hairline text-body-sm">
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="shrink-0 text-ink-subtle">College</dt>
              <dd className="text-right">{data.college ?? "NxtWave workshop"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="shrink-0 text-ink-subtle">Issued</dt>
              <dd className="text-right">{formatDate(data.issuedAt)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="shrink-0 text-ink-subtle">Workshop</dt>
              <dd className="min-w-0 break-all text-right font-mono text-label tabular-nums">
                {data.workshopId}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-label font-medium",
                data.valid ? "border-success/40 text-success" : "border-warning/40 text-warning",
              )}
            >
              {data.valid ? <CheckIcon className="h-3.5 w-3.5" /> : null}
              {data.valid ? "Verified certificate" : "Verification pending"}
            </span>
            {data.isSimulated ? <SimulatedBadge /> : null}
          </div>
          <p className="mt-5 break-all font-mono text-label text-ink-subtle">
            Certificate id: {data.certId}
          </p>
        </div>
      </section>
      <div className="mt-5 flex flex-col gap-3">
        <a
          className={buttonClass({ variant: "primary", size: "lg", fullWidth: true })}
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
        >
          Share on WhatsApp
        </a>
        <button
          className={buttonClass({ variant: "secondary", size: "lg", fullWidth: true })}
          type="button"
          onClick={() => window.print()}
        >
          Print / save as PDF
        </button>
      </div>
    </CertShell>
  );
}
