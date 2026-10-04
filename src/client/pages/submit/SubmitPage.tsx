import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import type { Evaluation, SubmissionResponse } from "../../../shared/contracts";

const RUBRIC_LABELS: { key: keyof Evaluation["breakdown"]; label: string; max: number }[] = [
  { key: "worksLive", label: "Works live", max: 30 },
  { key: "meaningfulAi", label: "Meaningful use of AI", max: 25 },
  { key: "problemClarity", label: "Problem clarity", max: 20 },
  { key: "readmeHygiene", label: "README and code hygiene", max: 15 },
  { key: "originality", label: "Originality", max: 10 },
];

interface ApiErrorShape {
  error?: { code?: string; message?: string };
}

class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(path, { credentials: "same-origin", ...init, headers });
  const payload = (await response.json().catch(() => null)) as (T & ApiErrorShape) | null;
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? "Something went wrong. Please try again.",
      response.status,
      payload?.error?.code ?? "INTERNAL",
    );
  }
  return payload as T;
}

export default function SubmitPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t");
  const [liveUrl, setLiveUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [result, setResult] = useState<SubmissionResponse | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const path = token ? `/api/me?t=${encodeURIComponent(token)}` : "/api/me";
    apiFetch<{ referralLink?: string }>(path, token)
      .then((me) => {
        if (!cancelled && typeof me.referralLink === "string") setReferralLink(me.referralLink);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token]);

  const shareText = useMemo(() => {
    if (!result) return "";
    const scoreLine = result.score !== null ? `I scored ${result.score}/100` : "I shipped my project";
    const link = referralLink ?? window.location.origin;
    return `${scoreLine} at NxtWave's free 60-minute AI workshop. Build yours: ${link}`;
  }, [result, referralLink]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNeedsAuth(false);
    setRateLimited(false);
    setSubmitting(true);
    try {
      const response = await apiFetch<SubmissionResponse>("/api/submissions", token, {
        method: "POST",
        body: JSON.stringify({ liveUrl, repoUrl: repoUrl.trim(), description }),
      });
      setResult(response);
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 401) setNeedsAuth(true);
        else if (caught.status === 429) setRateLimited(true);
        else if (caught.code === "INVALID_INPUT") setError(caught.message);
        else setError(caught.message);
      } else {
        setError("Could not submit right now. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-5 py-10 text-[#2E333B]">
        <p className="text-sm font-bold tracking-wide text-[#1F3A93]">Ship60 · project check</p>
        <h1 className="mt-1 text-2xl font-bold">
          {result.status === "evaluated" ? "Your project scored" : "Project saved"}
        </h1>
        {result.status === "evaluated" && result.evaluation && (
          <>
            <p className="mt-3 text-5xl font-bold text-[#1F3A93]">
              {result.evaluation.score}
              <span className="text-xl text-[#5A6472]">/100</span>
            </p>
            <ul className="mt-5 space-y-2">
              {RUBRIC_LABELS.map(({ key, label, max }) => (
                <li key={key} className="text-sm">
                  <div className="flex justify-between">
                    <span>{label}</span>
                    <span className="font-semibold">
                      {result.evaluation!.breakdown[key]}/{max}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded bg-[#DDE5F2]">
                    <div
                      className="h-1.5 rounded bg-[#1F3A93]"
                      style={{ width: `${Math.round((result.evaluation!.breakdown[key] / max) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <section className="mt-6 rounded-lg border border-[#DDE5F2] bg-white p-4">
              <h2 className="text-sm font-bold">What worked</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {result.evaluation.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section className="mt-4 rounded-lg border border-[#DDE5F2] bg-white p-4">
              <h2 className="text-sm font-bold">Improve next</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {result.evaluation.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <p className="mt-4 rounded-lg bg-[#FFE45C]/40 p-4 text-sm">
              <strong>Next feature:</strong> {result.evaluation.nextFeature}
            </p>
          </>
        )}
        {(result.status === "manual" || result.status === "failed") && (
          <p className="mt-4 rounded-lg border border-[#DDE6F2] bg-white p-4 text-sm">
            Your project was saved but the AI evaluator could not score it right now (it may be offline or the live
            link did not respond). Nothing is lost — it is queued for manual review.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3">
          <a
            className="rounded-lg bg-[#1F3A93] px-4 py-3 text-center font-bold text-white"
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noreferrer"
          >
            Share on WhatsApp
          </a>
          <a
            className="rounded-lg border border-[#1F3A93] px-4 py-3 text-center font-bold text-[#1F3A93]"
            href={result.shippedCardPath}
            target="_blank"
            rel="noreferrer"
          >
            I shipped it — open my share card
          </a>
          <Link className="text-center text-sm font-semibold text-[#1F3A93]" to={token ? `/me?t=${token}` : "/me"}>
            Back to my Launchpad
          </Link>
        </div>
        {result.status === "evaluated" && (
          <p className="mt-6 text-xs text-[#5A6472]">
            Share card image arrives with the next deploy of the OG service. The link above always works.
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 py-10 text-[#2E333B]">
      <p className="text-sm font-bold tracking-wide text-[#1F3A93]">Ship60 · project check</p>
      <h1 className="mt-1 text-2xl font-bold">Submit your project</h1>
      <p className="mt-2 text-sm text-[#5A6472]">
        Paste the link you deployed and your GitHub repo. We check that the page is live and score it against the
        workshop rubric.
      </p>

      {needsAuth && (
        <p className="mt-4 rounded-lg border border-[#D7263D] bg-white p-3 text-sm">
          Open your Launchpad first, then come back.{" "}
          <Link className="font-semibold text-[#1F3A93]" to="/me">
            Go to my Launchpad
          </Link>
        </p>
      )}
      {rateLimited && (
        <p className="mt-4 rounded-lg border border-[#D7263D] bg-white p-3 text-sm">
          You have submitted 3 projects this hour. Try again a little later.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-[#D7263D] bg-white p-3 text-sm">{error}</p>
      )}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-sm font-semibold">Deployed project URL</span>
          <input
            className="mt-1 w-full rounded-lg border border-[#DDE5F2] bg-white px-3 py-3 text-base"
            type="url"
            inputMode="url"
            required
            placeholder="https://my-project.example.com"
            value={liveUrl}
            onChange={(event) => setLiveUrl(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">GitHub repository (optional)</span>
          <input
            className="mt-1 w-full rounded-lg border border-[#DDE5F2] bg-white px-3 py-3 text-base"
            type="url"
            inputMode="url"
            placeholder="https://github.com/you/project"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">What does it do? (2 lines)</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-[#DDE5F2] bg-white px-3 py-3 text-base"
            required
            minLength={10}
            maxLength={600}
            rows={3}
            placeholder="Who is it for and what problem does it solve? What does the AI do?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <span className="mt-1 block text-xs text-[#5A6472]">{description.trim().length}/600</span>
        </label>
        <button
          className="w-full rounded-lg bg-[#1F3A93] px-4 py-3 font-bold text-white disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Checking your project…" : "Check my project"}
        </button>
      </form>
      <p className="mt-4 text-xs text-[#5A6472]">
        We fetch your page and README once. Fetched content is treated as untrusted data and never as instructions.
      </p>
    </main>
  );
}
