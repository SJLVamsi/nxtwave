import { useState } from "react";
import { Button, Input, cn } from "../../design";
import { CheckIcon, ConnectionStatus } from "../me/ui";
import { readTokenFromUrl, useLiveRoom } from "./useLiveRoom";

const STEP_LABELS = [
  "Set up",
  "Pick your idea",
  "Build the page",
  "Add the AI",
  "Deploy it",
  "Share it",
];

export default function LivePage() {
  const [token] = useState<string | null>(() => readTokenFromUrl());
  const { snapshot, status, poll, quiz, leaderboard, error, send, retry } = useLiveRoom(
    "participant",
    token,
  );
  const [answeredPoll, setAnsweredPoll] = useState<string | null>(null);
  const [answeredQuiz, setAnsweredQuiz] = useState<string | null>(null);
  const [helpNote, setHelpNote] = useState("");
  const [helpSent, setHelpSent] = useState(false);
  const [shipUrl, setShipUrl] = useState("");
  const [shipSent, setShipSent] = useState(false);
  const [guestName, setGuestName] = useState("");

  return (
    <main className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-8">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-display-lg text-ink text-balance">
              Live build room
            </h1>
            <p className="mt-1 text-body-sm text-ink-muted" aria-live="polite">
              <span className="font-mono text-mono-data text-ink tabular-nums">
                {snapshot.attendance}
              </span>{" "}
              checked in
            </p>
          </div>
          <ConnectionStatus status={status} />
        </header>

        {error ? (
          <section className="rounded-panel border border-hairline bg-surface-1 p-4">
            <p className="text-body-sm text-danger">{error}</p>
            <Button variant="secondary" className="mt-3" onClick={retry}>
              Retry
            </Button>
          </section>
        ) : null}

        <section className="rounded-panel border border-hairline bg-surface-1 p-4">
          {snapshot.checkedIn ? (
            <p
              className="flex items-center gap-2 text-body-sm font-medium text-success"
              data-testid="checked-in"
            >
              <CheckIcon />
              You are checked in. Your referral is counted.
            </p>
          ) : token || snapshot.hasSeat ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={status !== "open"}
              data-testid="checkin"
              onClick={() => send({ type: "checkin" })}
            >
              I&apos;m here — check in
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-body-sm leading-relaxed text-ink-muted">
                You&apos;re joining as a guest. Check-in needs a registered seat —{" "}
                <a
                  className="rounded-sm text-ink underline decoration-hairline-strong underline-offset-4 transition-colors duration-150 hover:text-signal"
                  href="/"
                >
                  register first
                </a>
                .
              </p>
              <Input
                label="Your name"
                value={guestName}
                maxLength={80}
                autoComplete="off"
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="Your name (for the help queue)"
              />
              <Button
                variant="secondary"
                fullWidth
                disabled={status !== "open" || guestName.trim().length < 2}
                onClick={() => send({ type: "join", name: guestName.trim() })}
              >
                Set
              </Button>
            </div>
          )}
        </section>

        <section
          className="rounded-panel border border-hairline bg-surface-1 p-4"
          aria-label="Build step"
        >
          <p className="text-body-sm font-medium text-ink">
            Step <span className="font-mono text-mono-data tabular-nums">{snapshot.step}</span> of 6
            · {STEP_LABELS[snapshot.step - 1]}
          </p>
          <ol className="mt-3 grid grid-cols-6 gap-1" aria-hidden="true">
            {STEP_LABELS.map((label, index) => {
              const step = index + 1;
              return (
                <li
                  key={label}
                  title={label}
                  className={cn(
                    "h-0.5 transition-colors duration-[var(--dur-ui)] ease-[var(--ease-out)]",
                    step < snapshot.step
                      ? "bg-ink-subtle"
                      : step === snapshot.step
                        ? "bg-signal"
                        : "bg-hairline",
                  )}
                />
              );
            })}
          </ol>
        </section>

        {poll ? (
          <section
            className="overflow-hidden rounded-panel border border-hairline bg-surface-1"
            aria-label="Poll"
          >
            <h2 className="px-4 pb-3 pt-4 text-title text-ink text-balance">{poll.question}</h2>
            <ul className="divide-y divide-hairline border-t border-hairline">
              {poll.options.map((option, index) => {
                const answered = answeredPoll === poll.questionId;
                return (
                  <li key={`${poll.questionId}-${index}`}>
                    <button
                      type="button"
                      disabled={answered}
                      onClick={() => {
                        if (
                          send({ type: "poll_answer", questionId: poll.questionId, option: index })
                        ) {
                          setAnsweredPoll(poll.questionId);
                        }
                      }}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-body-sm transition-colors duration-[var(--dur-ui)]",
                        answered
                          ? "text-ink-muted"
                          : "text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal",
                      )}
                    >
                      <span className="min-w-0">{option}</span>
                      {answered ? (
                        <span className="shrink-0 font-mono text-mono-data text-ink tabular-nums">
                          {poll.counts[index] ?? 0}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {quiz ? (
          <section
            className="overflow-hidden rounded-panel border border-hairline bg-surface-1"
            aria-label="Quiz"
          >
            <h2 className="px-4 pb-3 pt-4 text-title text-ink text-balance">{quiz.question}</h2>
            <ul className="divide-y divide-hairline border-t border-hairline">
              {quiz.options.map((option, index) => {
                const answered = answeredQuiz === quiz.questionId;
                return (
                  <li key={`${quiz.questionId}-${index}`}>
                    <button
                      type="button"
                      disabled={answered}
                      onClick={() => {
                        if (
                          send({ type: "quiz_answer", questionId: quiz.questionId, option: index })
                        ) {
                          setAnsweredQuiz(quiz.questionId);
                        }
                      }}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-body-sm transition-colors duration-[var(--dur-ui)]",
                        answered
                          ? "text-ink-muted"
                          : "text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal",
                      )}
                    >
                      <span className="min-w-0">{option}</span>
                      {answered ? (
                        <span className="shrink-0 font-mono text-mono-data text-ink tabular-nums">
                          {quiz.counts[index] ?? 0}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {leaderboard.length > 0 ? (
              <div className="border-t border-hairline px-4 py-3">
                <h3 className="text-label font-medium text-ink-subtle">Leaderboard</h3>
                <ol className="mt-2 divide-y divide-hairline">
                  {leaderboard.map((row) => (
                    <li
                      key={`${row.rank}-${row.name}`}
                      className="flex items-baseline justify-between gap-3 py-2 text-body-sm"
                    >
                      <span className="min-w-0 truncate">
                        <span className="mr-2 font-mono text-mono-data text-ink-subtle tabular-nums">
                          {row.rank}
                        </span>
                        {row.name}
                      </span>
                      <span className="shrink-0 font-mono text-mono-data text-ink tabular-nums">
                        {row.score}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </section>
        ) : null}

        <section
          className="rounded-panel border border-hairline bg-surface-1 p-4"
          aria-label="Ask the host for help"
        >
          <h2 className="text-body-sm font-medium text-ink">Stuck? Ask the host.</h2>
          {helpSent ? (
            <p className="mt-2 text-body-sm text-success">You&apos;re in the help queue.</p>
          ) : (
            <form
              className="mt-3 space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                const note = helpNote.trim();
                if (send({ type: "stuck", ...(note ? { note } : {}) })) {
                  setHelpSent(true);
                  setHelpNote("");
                }
              }}
            >
              <Input
                label="What are you stuck on?"
                value={helpNote}
                maxLength={280}
                autoComplete="off"
                onChange={(event) => setHelpNote(event.target.value)}
                placeholder="What are you stuck on? (optional)"
              />
              <Button variant="secondary" fullWidth type="submit" disabled={status !== "open"}>
                I&apos;m stuck
              </Button>
            </form>
          )}
        </section>

        <section
          className="rounded-panel border border-hairline bg-surface-1 p-4"
          aria-label="Share your shipped project"
        >
          <h2 className="text-body-sm font-medium text-ink">Shipped it?</h2>
          {shipSent ? (
            <p className="mt-2 text-body-sm text-success">Nice. Your link is on the host feed.</p>
          ) : (
            <form
              className="mt-3 space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (send({ type: "shipped", url: shipUrl.trim() })) {
                  setShipSent(true);
                  setShipUrl("");
                }
              }}
            >
              <Input
                label="Deployed project link"
                type="url"
                required
                value={shipUrl}
                maxLength={500}
                inputMode="url"
                placeholder="https://your-project.example"
                onChange={(event) => setShipUrl(event.target.value)}
              />
              <Button variant="secondary" fullWidth type="submit" disabled={status !== "open"}>
                I shipped it
              </Button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
