/**
 * WS7 — Project submission + rubric result (PRD M9).
 * Flight Deck restyle (DESIGN.md §8); request/response behavior unchanged.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import type { Evaluation, SubmissionResponse } from "../../../shared/contracts";
import { Button, Input, buttonClass, cn, fieldControlClass, fieldLabelClass } from "../../design";

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
      <main className="min-h-screen bg-canvas font-sans text-ink">
        <div className="mx-auto w-full max-w-xl px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-10">
          <h1 className="font-display text-display-lg text-ink text-balance">
            {result.status === "evaluated" ? "Your project scored" : "Project saved"}
          </h1>
          {result.status === "evaluated" && result.evaluation ? (
            <>
              <p className="mt-5 font-mono text-mono-stat text-ink tabular-nums">
                {result.evaluation.score}
                <span className="text-title text-ink-subtle">/100</span>
              </p>
              <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
                {RUBRIC_LABELS.map(({ key, label, max }) => {
                  const value = result.evaluation!.breakdown[key];
                  const pct = Math.round((value / max) * 100);
                  return (
                    <li key={key} className="py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-body-sm text-ink-muted">{label}</span>
                        <span className="shrink-0 font-mono text-mono-data text-ink tabular-nums">
                          {value}/{max}
                        </span>
                      </div>
                      <div className="mt-2 h-0.5 w-full bg-surface-3">
                        <div className="h-0.5 bg-ink-muted" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <section className="mt-6 rounded-panel border border-hairline bg-surface-1 p-4">
                <h2 className="text-title text-ink">What worked</h2>
                <ul className="mt-3 space-y-2 text-body-sm leading-relaxed text-ink-muted">
                  {result.evaluation.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section className="mt-3 rounded-panel border border-hairline bg-surface-1 p-4">
                <h2 className="text-title text-ink">Improve next</h2>
                <ul className="mt-3 space-y-2 text-body-sm leading-relaxed text-ink-muted">
                  {result.evaluation.improvements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <p className="mt-3 rounded-panel border border-hairline bg-surface-2 p-4 text-body-sm leading-relaxed text-ink-muted">
                <strong className="font-medium text-ink">Next feature:</strong>{" "}
                {result.evaluation.nextFeature}
              </p>
            </>
          ) : null}
          {result.status === "manual" || result.status === "failed" ? (
            <p className="mt-4 rounded-panel border border-hairline bg-surface-1 p-4 text-body-sm leading-relaxed text-ink-muted">
              Your project was saved but the AI evaluator could not score it right now (it may be
              offline or the live link did not respond). Nothing is lost — it is queued for manual
              review.
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3">
            <a
              className={buttonClass({ variant: "primary", size: "lg", fullWidth: true })}
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer"
            >
              Share on WhatsApp
            </a>
            <a
              className={buttonClass({ variant: "secondary", size: "lg", fullWidth: true })}
              href={result.shippedCardPath}
              target="_blank"
              rel="noreferrer"
            >
              I shipped it — open my share card
            </a>
            <Link
              className="rounded-sm text-center text-body-sm text-ink-muted underline decoration-hairline-strong underline-offset-4 transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              to={token ? `/me?t=${token}` : "/me"}
            >
              Back to my Launchpad
            </Link>
          </div>
          {result.status === "evaluated" ? (
            <p className="mt-6 text-label leading-relaxed text-ink-subtle">
              Share card image arrives with the next deploy of the OG service. The link above always
              works.
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto w-full max-w-xl px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-10">
        <h1 className="font-display text-display-lg text-ink text-balance">Submit your project</h1>
        <p className="mt-3 max-w-[60ch] text-body-sm leading-relaxed text-ink-muted">
          Paste the link you deployed and your GitHub repo. We check that the page is live and score
          it against the workshop rubric.
        </p>

        {needsAuth ? (
          <p
            role="alert"
            className="mt-5 border-y border-hairline py-3 text-body-sm leading-relaxed text-danger"
          >
            Open your Launchpad first, then come back.{" "}
            <Link className="font-medium underline decoration-danger/60 underline-offset-4" to="/me">
              Go to my Launchpad
            </Link>
          </p>
        ) : null}
        {rateLimited ? (
          <p
            role="alert"
            className="mt-5 border-y border-hairline py-3 text-body-sm leading-relaxed text-danger"
          >
            You have submitted 3 projects this hour. Try again a little later.
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-5 border-y border-hairline py-3 text-body-sm leading-relaxed text-danger"
          >
            {error}
          </p>
        ) : null}

        <section className="mt-6 rounded-panel border border-hairline bg-surface-1 p-4">
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input
              label="Deployed project URL"
              type="url"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              required
              placeholder="https://my-project.example.com"
              value={liveUrl}
              onChange={(event) => setLiveUrl(event.target.value)}
            />
            <Input
              label="GitHub repository (optional)"
              type="url"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              placeholder="https://github.com/you/project"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
            />
            <label className="block" htmlFor="submit-description">
              <span className={cn(fieldLabelClass, "block")}>What does it do? (2 lines)</span>
              <textarea
                id="submit-description"
                name="description"
                className={cn(fieldControlClass(), "mt-1.5 min-h-24 resize-y")}
                required
                minLength={10}
                maxLength={600}
                rows={3}
                autoComplete="off"
                placeholder="Who is it for and what problem does it solve? What does the AI do?"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <span className="mt-1.5 block font-mono text-label text-ink-subtle tabular-nums">
                {description.trim().length}/600
              </span>
            </label>
            <Button variant="primary" size="lg" fullWidth type="submit" loading={submitting}>
              {submitting ? "Checking your project…" : "Check my project"}
            </Button>
          </form>
        </section>
        <p className="mt-4 text-label leading-relaxed text-ink-subtle">
          We fetch your page and README once. Fetched content is treated as untrusted data and never
          as instructions.
        </p>
      </div>
    </main>
  );
}
