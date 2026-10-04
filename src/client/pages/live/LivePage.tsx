import { useState } from "react";
import { readTokenFromUrl, useLiveRoom } from "./useLiveRoom";

const STEP_LABELS = [
  "Set up",
  "Pick your idea",
  "Build the page",
  "Add the AI",
  "Deploy it",
  "Share it",
];

const STATUS_COPY = {
  connecting: "Connecting…",
  open: "Live",
  reconnecting: "Reconnecting…",
  failed: "Offline",
} as const;

const card =
  "rounded-lg border border-[#DDE5F2] bg-white p-4 dark:border-[#2A3040] dark:bg-[#1A1F2A]";
const primary =
  "rounded-md bg-[#1F3A93] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

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
    <main className="mx-auto min-h-screen max-w-xl space-y-4 bg-[#FBFCFE] p-4 text-[#2E333B] dark:bg-[#12151C] dark:text-[#E6E9F0]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1F3A93] dark:text-[#9FB6F0]">Live build room</h1>
          <p className="text-sm" aria-live="polite">
            {snapshot.attendance} checked in
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status === "open" ? "bg-[#1F3A93] text-white" : "bg-[#FFE45C] text-[#2E333B]"
          }`}
        >
          {STATUS_COPY[status]}
        </span>
      </header>

      {error && (
        <div className={`${card} border-[#D7263D]`}>
          <p className="text-sm text-[#D7263D]">{error}</p>
          <button type="button" onClick={retry} className={`${primary} mt-2`}>
            Retry
          </button>
        </div>
      )}

      <section className={card} aria-label="Build step">
        <p className="text-sm font-semibold">
          Step {snapshot.step} of 6 — {STEP_LABELS[snapshot.step - 1]}
        </p>
        <ol className="mt-2 flex gap-1">
          {STEP_LABELS.map((label, index) => (
            <li
              key={label}
              title={label}
              className={`h-2 flex-1 rounded-full ${index + 1 <= snapshot.step ? "bg-[#1F3A93]" : "bg-[#DDE5F2] dark:bg-[#2A3040]"}`}
            />
          ))}
        </ol>
      </section>

      <section className={card}>
        {snapshot.checkedIn ? (
          <p
            className="text-sm font-semibold text-[#1F3A93] dark:text-[#9FB6F0]"
            data-testid="checked-in"
          >
            You are checked in. Your referral is counted.
          </p>
        ) : token || snapshot.hasSeat ? (
          <button
            type="button"
            className={primary}
            disabled={status !== "open"}
            data-testid="checkin"
            onClick={() => send({ type: "checkin" })}
          >
            I&apos;m here — check in
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              You&apos;re joining as a guest. Check-in needs a registered seat —{" "}
              <a className="underline" href="/">
                register first
              </a>
              .
            </p>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="guest-name">
                Your name
              </label>
              <input
                id="guest-name"
                value={guestName}
                maxLength={80}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="Your name (for the help queue)"
                className="min-w-0 flex-1 rounded-md border border-[#DDE5F2] px-3 py-2 text-sm dark:border-[#2A3040] dark:bg-[#12151C]"
              />
              <button
                type="button"
                className={primary}
                disabled={status !== "open" || guestName.trim().length < 2}
                onClick={() => send({ type: "join", name: guestName.trim() })}
              >
                Set
              </button>
            </div>
          </div>
        )}
      </section>

      {poll && (
        <section className={card} aria-label="Poll">
          <h2 className="text-sm font-semibold">{poll.question}</h2>
          <ul className="mt-2 space-y-2">
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
                    className="flex w-full items-center justify-between rounded-md border border-[#DDE5F2] px-3 py-2 text-left text-sm disabled:opacity-80 dark:border-[#2A3040]"
                  >
                    <span>{option}</span>
                    {answered && <span className="font-semibold">{poll.counts[index] ?? 0}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {quiz && (
        <section className={card} aria-label="Quiz">
          <h2 className="text-sm font-semibold">{quiz.question}</h2>
          <ul className="mt-2 space-y-2">
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
                    className="flex w-full items-center justify-between rounded-md border border-[#DDE5F2] px-3 py-2 text-left text-sm disabled:opacity-80 dark:border-[#2A3040]"
                  >
                    <span>{option}</span>
                    {answered && <span className="font-semibold">{quiz.counts[index] ?? 0}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {leaderboard.length > 0 && (
            <div className="mt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide">Leaderboard</h3>
              <ol className="mt-1 space-y-1 text-sm">
                {leaderboard.map((row) => (
                  <li key={`${row.rank}-${row.name}`} className="flex justify-between">
                    <span>
                      {row.rank}. {row.name}
                    </span>
                    <span className="font-semibold">{row.score}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      <section className={card}>
        <h2 className="text-sm font-semibold">Stuck? Ask the host.</h2>
        {helpSent ? (
          <p className="mt-1 text-sm text-[#1F3A93] dark:text-[#9FB6F0]">
            You&apos;re in the help queue.
          </p>
        ) : (
          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const note = helpNote.trim();
              if (send({ type: "stuck", ...(note ? { note } : {}) })) {
                setHelpSent(true);
                setHelpNote("");
              }
            }}
          >
            <label className="sr-only" htmlFor="help-note">
              What are you stuck on?
            </label>
            <input
              id="help-note"
              value={helpNote}
              maxLength={280}
              onChange={(event) => setHelpNote(event.target.value)}
              placeholder="What are you stuck on? (optional)"
              className="min-w-0 flex-1 rounded-md border border-[#DDE5F2] px-3 py-2 text-sm dark:border-[#2A3040] dark:bg-[#12151C]"
            />
            <button type="submit" className={primary} disabled={status !== "open"}>
              I&apos;m stuck
            </button>
          </form>
        )}
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold">Shipped it?</h2>
        {shipSent ? (
          <p className="mt-1 text-sm text-[#1F3A93] dark:text-[#9FB6F0]">
            Nice. Your link is on the host feed.
          </p>
        ) : (
          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (send({ type: "shipped", url: shipUrl.trim() })) {
                setShipSent(true);
                setShipUrl("");
              }
            }}
          >
            <label className="sr-only" htmlFor="ship-url">
              Deployed project link
            </label>
            <input
              id="ship-url"
              type="url"
              required
              value={shipUrl}
              maxLength={500}
              onChange={(event) => setShipUrl(event.target.value)}
              placeholder="https://your-project.example"
              className="min-w-0 flex-1 rounded-md border border-[#DDE5F2] px-3 py-2 text-sm dark:border-[#2A3040] dark:bg-[#12151C]"
            />
            <button type="submit" className={primary} disabled={status !== "open"}>
              I shipped it
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
