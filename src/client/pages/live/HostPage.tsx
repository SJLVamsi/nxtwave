import { useState } from "react";
import { useLiveRoom } from "./useLiveRoom";

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
  "rounded-md bg-[#1F3A93] px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";
const input =
  "min-w-0 flex-1 rounded-md border border-[#DDE5F2] px-2 py-1.5 text-sm dark:border-[#2A3040] dark:bg-[#12151C]";

export default function HostPage() {
  const { snapshot, status, stuck, shipped, error, send, retry } = useLiveRoom("host", null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", "", ""]);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptions, setQuizOptions] = useState(["", "", ""]);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const launchPoll = () => {
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (pollQuestion.trim().length < 3 || options.length < 2) {
      setNotice("Add a question and at least two options.");
      return;
    }
    if (send({ type: "launch_poll", question: pollQuestion.trim(), options })) {
      setNotice("Poll launched.");
    }
  };

  const launchQuiz = () => {
    const options = quizOptions.map((option) => option.trim());
    if (quizQuestion.trim().length < 3 || options.length < 2 || options.some((option) => !option)) {
      setNotice("Add a question and at least two options.");
      return;
    }
    if (quizCorrect >= options.length) {
      setNotice("Pick which option is correct.");
      return;
    }
    if (
      send({ type: "launch_quiz", question: quizQuestion.trim(), options, correct: quizCorrect })
    ) {
      setNotice("Quiz question launched.");
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-4 bg-[#FBFCFE] p-4 text-[#2E333B] dark:bg-[#12151C] dark:text-[#E6E9F0]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1F3A93] dark:text-[#9FB6F0]">Host console</h1>
          <p className="text-sm" aria-live="polite">
            {snapshot.attendance} checked in · step {snapshot.step} of 6
          </p>
        </div>
        <div className="text-right">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === "open" ? "bg-[#1F3A93] text-white" : "bg-[#FFE45C] text-[#2E333B]"
            }`}
          >
            {STATUS_COPY[status]}
          </span>
          {status !== "open" && (
            <button type="button" className={`${primary} ml-2`} onClick={retry}>
              Retry
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className={`${card} border-[#D7263D]`}>
          <p className="text-sm text-[#D7263D]">{error}</p>
        </div>
      )}

      <section className={card} aria-label="Build step control">
        <h2 className="text-sm font-semibold">Build step</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STEP_LABELS.map((label, index) => {
            const step = index + 1;
            const active = snapshot.step === step;
            return (
              <button
                key={label}
                type="button"
                disabled={status !== "open"}
                onClick={() => send({ type: "advance_step", step })}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  active
                    ? "border-[#1F3A93] bg-[#1F3A93] text-white"
                    : "border-[#DDE5F2] dark:border-[#2A3040]"
                }`}
              >
                {step}. {label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className={card} aria-label="Launch poll">
          <h2 className="text-sm font-semibold">Launch a poll</h2>
          <label className="mt-2 block text-xs" htmlFor="poll-question">
            Question
          </label>
          <input
            id="poll-question"
            value={pollQuestion}
            maxLength={200}
            onChange={(event) => setPollQuestion(event.target.value)}
            className={`${input} mt-1 w-full`}
          />
          <div className="mt-2 space-y-2">
            {pollOptions.map((option, index) => (
              <input
                key={index}
                value={option}
                maxLength={80}
                onChange={(event) =>
                  setPollOptions(
                    pollOptions.map((value, i) => (i === index ? event.target.value : value)),
                  )
                }
                placeholder={`Option ${index + 1}`}
                className={`${input} w-full`}
              />
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={input}
              onClick={() => pollOptions.length < 6 && setPollOptions([...pollOptions, ""])}
            >
              Add option
            </button>
            {pollOptions.length > 2 && (
              <button
                type="button"
                className={input}
                onClick={() => setPollOptions(pollOptions.slice(0, -1))}
              >
                Remove
              </button>
            )}
            <button
              type="button"
              className={primary}
              disabled={status !== "open"}
              onClick={launchPoll}
            >
              Launch poll
            </button>
          </div>
        </section>

        <section className={card} aria-label="Launch quiz">
          <h2 className="text-sm font-semibold">Launch a quiz question</h2>
          <label className="mt-2 block text-xs" htmlFor="quiz-question">
            Question
          </label>
          <input
            id="quiz-question"
            value={quizQuestion}
            maxLength={200}
            onChange={(event) => setQuizQuestion(event.target.value)}
            className={`${input} mt-1 w-full`}
          />
          <div className="mt-2 space-y-2">
            {quizOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="quiz-correct"
                  checked={quizCorrect === index}
                  onChange={() => setQuizCorrect(index)}
                  aria-label={`Option ${index + 1} is correct`}
                />
                <input
                  value={option}
                  maxLength={80}
                  onChange={(event) =>
                    setQuizOptions(
                      quizOptions.map((value, i) => (i === index ? event.target.value : value)),
                    )
                  }
                  placeholder={`Option ${index + 1}`}
                  className={`${input} w-full`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={input}
              onClick={() => quizOptions.length < 6 && setQuizOptions([...quizOptions, ""])}
            >
              Add option
            </button>
            {quizOptions.length > 2 && (
              <button
                type="button"
                className={input}
                onClick={() => {
                  setQuizOptions(quizOptions.slice(0, -1));
                  setQuizCorrect(0);
                }}
              >
                Remove
              </button>
            )}
            <button
              type="button"
              className={primary}
              disabled={status !== "open"}
              onClick={launchQuiz}
            >
              Launch quiz
            </button>
          </div>
        </section>
      </div>

      {notice && <p className="text-sm text-[#1F3A93] dark:text-[#9FB6F0]">{notice}</p>}

      <section className={card} aria-label="Stuck queue">
        <h2 className="text-sm font-semibold">Help queue ({stuck.length})</h2>
        {stuck.length === 0 ? (
          <p className="mt-1 text-sm opacity-70">No one is stuck right now.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {stuck.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <strong>{item.name}</strong>
                  {item.note ? ` — ${item.note}` : ""}
                </span>
                <button
                  type="button"
                  className={primary}
                  disabled={status !== "open"}
                  onClick={() => send({ type: "resolve_stuck", entryId: item.id })}
                >
                  Resolve
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card} aria-label="Shipped feed">
        <h2 className="text-sm font-semibold">Shipped ({shipped.length})</h2>
        {shipped.length === 0 ? (
          <p className="mt-1 text-sm opacity-70">Nothing shipped yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {shipped.map((item) => (
              <li key={`${item.at}-${item.url}`}>
                <strong>{item.name}</strong> —{" "}
                <a className="underline" href={item.url} target="_blank" rel="noreferrer">
                  {item.url}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
