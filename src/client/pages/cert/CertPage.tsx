import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { SIMULATED_LABEL } from "../../../shared/constants";
import type { CertificateResponse } from "../../../shared/contracts";

async function fetchCertificate(id: string): Promise<CertificateResponse | null> {
  const response = await fetch(`/api/submissions/cert/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not verify this certificate right now.");
  return (await response.json()) as CertificateResponse;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(date);
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
    return <main className="p-6 text-sm opacity-70">Verifying certificate…</main>;
  }
  if (isError) {
    return (
      <main className="mx-auto max-w-xl px-5 py-10 text-[#2E333B]">
        <h1 className="text-xl font-bold">Could not verify this certificate</h1>
        <p className="mt-2 text-sm">Please try again in a moment.</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="mx-auto max-w-xl px-5 py-10 text-[#2E333B]">
        <h1 className="text-xl font-bold">No certificate with that id</h1>
        <p className="mt-2 text-sm">Check the link, or ask the student to share their certificate id again.</p>
        <Link className="mt-4 inline-block font-semibold text-[#1F3A93]" to="/">
          Go to the workshop page
        </Link>
      </main>
    );
  }

  const shareText = `${data.name} completed NxtWave's 60-minute AI workshop${
    data.projectTitle ? ` and built ${data.projectTitle}` : ""
  }. Verify: ${window.location.href}`;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-10 text-[#2E333B]">
      <p className="text-sm font-bold tracking-wide text-[#1F3A93]">NxtWave · Ship60</p>
      <section className="mt-4 rounded-xl border border-[#DDE5F2] bg-white p-6">
        <h1 className="text-2xl font-bold">Certificate of completion</h1>
        <p className="mt-4 text-lg font-semibold">{data.name}</p>
        {data.projectTitle && (
          <p className="mt-1 text-base">
            built <span className="bg-[#FFE45C] px-1">{data.projectTitle}</span>
          </p>
        )}
        <dl className="mt-5 space-y-1 text-sm text-[#5A6472]">
          <div>
            <dt className="inline font-semibold text-[#2E333B]">College: </dt>
            <dd className="inline">{data.college ?? "NxtWave workshop"}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-[#2E333B]">Issued: </dt>
            <dd className="inline">{formatDate(data.issuedAt)}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-[#2E333B]">Workshop: </dt>
            <dd className="inline">{data.workshopId}</dd>
          </div>
        </dl>
        <span
          className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-bold ${
            data.valid ? "bg-[#E7F6EC] text-[#1D6B3A]" : "bg-[#FDECEF] text-[#B01731]"
          }`}
        >
          {data.valid ? "Verified certificate" : "Verification pending"}
        </span>
        {data.isSimulated ? (
          <span className="mt-4 ml-2 inline-block rounded-full border border-[#DDE5F2] bg-[#FFE45C] px-3 py-1 text-xs font-bold text-[#2E333B]">
            {SIMULATED_LABEL}
          </span>
        ) : null}
        <p className="mt-4 break-all text-xs text-[#5A6472]">Certificate id: {data.certId}</p>
      </section>
      <div className="mt-5 flex flex-col gap-3">
        <a
          className="rounded-lg bg-[#1F3A93] px-4 py-3 text-center font-bold text-white"
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
        >
          Share on WhatsApp
        </a>
        <button
          className="rounded-lg border border-[#1F3A93] px-4 py-3 font-bold text-[#1F3A93]"
          type="button"
          onClick={() => window.print()}
        >
          Print / save as PDF
        </button>
      </div>
    </main>
  );
}
