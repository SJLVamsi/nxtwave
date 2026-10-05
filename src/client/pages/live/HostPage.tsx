import { useState } from "react";
import { Button, Input, cn } from "../../design";
import { ConnectionStatus } from "../me/ui";
import { useLiveRoom } from "./useLiveRoom";

const STEP_LABELS = [
  "Set up",
  "Pick your idea",
  "Build the page",
  "Add the AI",
  "Deploy it",
  "Share it",
];

function addOption(options: string[], limit: number): string[] {
  return options.length < limit ? [...options, ""] : options;
}

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
    <main className="min-h-screen bg-canvas font-sans text-ink">
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-8">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-display-lg text-ink text-balance">Host console</h1>
            <p className="mt-1 text-body-sm text-ink-muted" aria-live="polite">
              <span className="font-mono text-mono-data text-ink tabular-nums">
                {snapshot.attendance}
              </span>{" "}
              checked in · step{" "}
              <span className="font-mono text-mono-data text-ink tabular-nums">
                {snapshot.step}
              </span>{" "}
              of 6
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ConnectionStatus status={status} />
          </div>
        </header>

        {error ? (
          <section className="rounded-panel border border-hairline bg-surface-1 p-4">
            <p className="text-body-sm text-danger">{error}</p>
            <Button variant="secondary" className="mt-3" onClick={retry}>
              Retry
            </Button>
          </section>
        ) : null}

        <section
          className="overflow-hidden rounded-panel border border-hairline bg-surface-1"
          aria-label="Build step control"
        >
          <h2 className="px-4 pb-1 pt-4 text-title text-ink">Build step</h2>
          <ol className="mt-2 divide-y divide-hairline border-t border-hairline">
            {STEP_LABELS.map((label, index) => {
              const step = index + 1;
              const active = snapshot.step === step;
              return (
                <li key={label}>
                  <button
                    type="button"
                    disabled={status !== "open"}
                    aria-current={active ? "step" : undefined}
                    onClick={() => send({ type: "advance_step", step })}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-body-sm transition-colors duration-[var(--dur-ui)]",
                      active ? "text-signal" : "text-ink-muted",
                      status === "open" && !active && "hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    <span className="min-w-0 truncate">
                      <span
                        className={cn(
                          "mr-2 font-mono text-mono-data tabular-nums",
                          active ? "text-signal" : "text-ink-subtle",
                        )}
                      >
                        {step}
                      </span>
                      {label}
                    </span>
                    {active ? (
                      <span className="text-label font-medium text-signal">Current</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        <section
          className="rounded-panel border border-hairline bg-surface-1 p-4"
          aria-label="Launch poll"
        >
          <h2 className="text-title text-ink">Launch a poll</h2>
          <div className="mt-3 space-y-3">
            <Input
              label="Question"
              value={pollQuestion}
              maxLength={200}
              autoComplete="off"
              onChange={(event) => setPollQuestion(event.target.value)}
            />
            {pollOptions.map((option, index) => (
              <Input
                key={index}
                label={`Option ${index + 1}`}
                value={option}
                maxLength={80}
                autoComplete="off"
                onChange={(event) =>
                  setPollOptions(
                    pollOptions.map((value, i) => (i === index ? event.target.value : value)),
                  )
                }
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setPollOptions(addOption(pollOptions, 6))}>
              Add option
            </Button>
            {pollOptions.length > 2 ? (
              <Button variant="ghost" onClick={() => setPollOptions(pollOptions.slice(0, -1))}>
                Remove
              </Button>
            ) : null}
            <Button variant="primary" disabled={status !== "open"} onClick={launchPoll}>
              Launch poll
            </Button>
          </div>
        </section>

        <section
          className="rounded-panel border border-hairline bg-surface-1 p-4"
          aria-label="Launch quiz"
        >
          <h2 className="text-title text-ink">Launch a quiz question</h2>
          <div className="mt-3 space-y-3">
            <Input
              label="Question"
              value={quizQuestion}
              maxLength={200}
              autoComplete="off"
              onChange={(event) => setQuizQuestion(event.target.value)}
            />
            {quizOptions.map((option, index) => (
              <div key={index} className="flex items-end gap-2">
                <input
                  type="radio"
                  name="quiz-correct"
                  checked={quizCorrect === index}
                  onChange={() => setQuizCorrect(index)}
                  aria-label={`Option ${index + 1} is correct`}
                  className="mb-3 h-4 w-4 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <Input
                    label={`Option ${index + 1}`}
                    value={option}
                    maxLength={80}
                    autoComplete="off"
                    onChange={(event) =>
                      setQuizOptions(
                        quizOptions.map((value, i) => (i === index ? event.target.value : value)),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setQuizOptions(addOption(quizOptions, 6))}>
              Add option
            </Button>
            {quizOptions.length > 2 ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setQuizOptions(quizOptions.slice(0, -1));
                  setQuizCorrect(0);
                }}
              >
                Remove
              </Button>
            ) : null}
            <Button variant="primary" disabled={status !== "open"} onClick={launchQuiz}>
              Launch quiz
            </Button>
          </div>
        </section>

        {notice ? (
          <p role="status" className="text-body-sm text-ink-muted">
            {notice}
          </p>
        ) : null}

        <section
          className="rounded-panel border border-hairline bg-surface-1 p-4"
          aria-label="Stuck queue"
        >
          <h2 className="text-title text-ink">Help queue ({stuck.length})</h2>
          {stuck.length === 0 ? (
            <p className="mt-2 text-body-sm text-ink-subtle">No one is stuck right now.</p>
          ) : (
            <ul className="mt-2 divide-y divide-hairline">
              {stuck.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0 text-body-sm leading-relaxed text-ink-muted">
                    <strong className="font-medium text-ink">{item.name}</strong>
                    {item.note ? ` — ${item.note}` : ""}
                  </span>
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    disabled={status !== "open"}
                    onClick={() => send({ type: "resolve_stuck", entryId: item.id })}
                  >
                    Resolve
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="rounded-panel border border-hairline bg-surface-1 p-4"
          aria-label="Shipped feed"
        >
          <h2 className="text-title text-ink">Shipped ({shipped.length})</h2>
          {shipped.length === 0 ? (
            <p className="mt-2 text-body-sm text-ink-subtle">Nothing shipped yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-hairline">
              {shipped.map((item) => (
                <li key={`${item.at}-${item.url}`} className="py-3 text-body-sm">
                  <span className="font-medium text-ink">{item.name}</span>
                  <span className="mx-1.5 text-ink-subtle">—</span>
                  <a
                    className="break-all text-ink-muted underline decoration-hairline-strong underline-offset-4 transition-colors duration-150 hover:text-ink"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
