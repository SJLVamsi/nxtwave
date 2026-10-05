/**
 * /plan — the 5-slide growth plan as an HTML deck (PRD M12).
 * Full-viewport slides, display type, keyboard + swipe navigation, and a print
 * stylesheet that turns Cmd+P into exactly 5 clean A4-landscape pages with no
 * navigation chrome. All numbers come from src/shared/plan.ts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../design";
import { SLIDES } from "./deck";

const DECK_CSS = `
.plan-slide { display: none; }
.plan-slide[data-current="true"] { display: block; }

.plan-slide-inner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: calc(100svh - 7.5rem);
  padding: 2rem 0 2.5rem;
}

.plan-deck { padding-bottom: calc(4rem + env(safe-area-inset-bottom)); }

.plan-slide[data-current="true"] .plan-slide-inner {
  animation: plan-slide-in 260ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) both;
}

@keyframes plan-slide-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

.plan-chart .plan-grid { stroke: var(--hairline, var(--color-hairline, #272b31)); }
.plan-chart .plan-axis {
  fill: var(--ink-subtle, var(--color-ink-subtle, #7d8590));
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}
.plan-chart .plan-series { stroke: var(--signal, var(--color-signal, #c8f250)); }
.plan-chart .plan-dot { fill: var(--signal, var(--color-signal, #c8f250)); }
.plan-chart .plan-value {
  fill: var(--ink, var(--color-ink, #f4f6f8));
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}
.plan-chart .plan-target { stroke: var(--hairline-strong, var(--color-hairline-strong, #3a3f47)); }
.plan-chart .plan-target-label {
  fill: var(--ink-subtle, var(--color-ink-subtle, #7d8590));
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}

@media (prefers-reduced-motion: reduce) {
  .plan-slide[data-current="true"] .plan-slide-inner { animation: none; }
}

@media print {
  @page { size: A4 landscape; margin: 8mm; }
  html, body { background: #ffffff !important; }
  .plan-shell {
    --canvas: #ffffff;
    --surface-1: #ffffff;
    --surface-2: #f7f8f9;
    --surface-3: #eef0f2;
    --hairline: #d3d7dc;
    --hairline-strong: #8f979f;
    --ink: #0a0b0d;
    --ink-muted: #3a424c;
    --ink-subtle: #59636e;
    --signal: #5a6e00;
    --signal-ink: #ffffff;
    --success: #16724a;
    --warning: #7a5000;
    --danger: #b32c2c;
    --info: #15598f;
    background: #ffffff !important;
    color: #0a0b0d !important;
  }
  .plan-chrome { display: none !important; }
  .plan-deck { max-width: none !important; margin: 0 !important; padding: 0 !important; }
  .plan-slide {
    display: block !important;
    break-after: page;
    page-break-after: always;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .plan-slide[data-current="true"] .plan-slide-inner { animation: none !important; }
  .plan-slide:last-of-type { break-after: auto; page-break-after: auto; }
  .plan-slide-inner {
    display: block !important;
    min-height: 0 !important;
    padding: 0 !important;
  }
  .plan-slide h2 { font-size: 19pt !important; line-height: 1.12 !important; }
  .plan-slide h3 { font-size: 10pt !important; }
  .plan-slide p,
  .plan-slide li,
  .plan-slide td,
  .plan-slide dd,
  .plan-slide dt,
  .plan-slide code { font-size: 8.5pt !important; line-height: 1.35 !important; }
  .plan-slide a { color: inherit !important; text-decoration: none !important; }
  .plan-chart { height: auto !important; }
  .plan-chart .plan-grid { stroke: #d3d7dc; }
  .plan-chart .plan-axis, .plan-chart .plan-value, .plan-chart .plan-target-label { fill: #3a424c; }
  .plan-chart .plan-series, .plan-chart .plan-dot { stroke: #5a6e00; }
  .plan-chart .plan-dot { fill: #5a6e00; }
  .plan-chart .plan-target { stroke: #8f979f; }
  .plan-map-cta { display: none !important; }
}
`;

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? <path d="M10 3.5 5.5 8l4.5 4.5" /> : <path d="M6 3.5 10.5 8 6 12.5" />}
    </svg>
  );
}

export default function PlanPage() {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const step = useCallback((delta: number) => {
    setIndex((current) => Math.max(0, Math.min(SLIDES.length - 1, current + delta)));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        setIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setIndex(SLIDES.length - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step]);

  const current = SLIDES[index];

  return (
    <main
      className="plan-shell min-h-screen bg-canvas font-sans text-ink"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        if (!start) return;
        touchStart.current = null;
        const touch = event.changedTouches[0];
        if (!touch) return;
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          step(dx < 0 ? 1 : -1);
        }
      }}
    >
      <style>{DECK_CSS}</style>

      <header className="plan-chrome sticky top-0 z-20 border-b border-hairline bg-canvas">
        <div className="relative mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-4 sm:px-6">
          <p className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 text-[15px] font-semibold tracking-[-0.02em] text-ink">
              Ship60
            </span>
            <span className="truncate font-mono text-[11px] text-ink-subtle">growth plan</span>
          </p>
          <p
            className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-ink-muted"
            aria-label={`Slide ${index + 1} of ${SLIDES.length}: ${current.label}`}
          >
            {index + 1} / {SLIDES.length}
          </p>
          <span className="hidden max-w-[18ch] truncate text-[12px] text-ink-subtle sm:inline">
            {current.label}
          </span>
          <Button variant="secondary" onClick={() => window.print()}>
            Print / save PDF
          </Button>
          <div className="absolute inset-x-0 -bottom-px h-px bg-hairline" aria-hidden="true">
            <div
              className="h-px bg-signal transition-[width] duration-[var(--dur-panel)] ease-[var(--ease-out)]"
              style={{ width: `${((index + 1) / SLIDES.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="plan-deck mx-auto max-w-[1120px] px-4 sm:px-6">
        {SLIDES.map((slide, slideIndex) => {
          const Slide = slide.Component;
          return (
            <section
              key={slide.id}
              className="plan-slide"
              data-testid="plan-slide"
              data-current={slideIndex === index}
              data-slide={slideIndex + 1}
              aria-label={`${slideIndex + 1}: ${slide.label}`}
              aria-hidden={slideIndex !== index}
            >
              <Slide />
            </section>
          );
        })}
      </div>

      <nav
        className="plan-chrome fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-surface-1 [padding-bottom:env(safe-area-inset-bottom)]"
        aria-label="Deck navigation"
      >
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-3 px-4 sm:px-6">
          <Button variant="secondary" disabled={index === 0} onClick={() => step(-1)}>
            <Chevron direction="left" />
            Previous
          </Button>
          <div className="mx-auto flex items-center">
            {SLIDES.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setIndex(slideIndex)}
                aria-label={`Go to slide ${slideIndex + 1}: ${slide.label}`}
                aria-current={slideIndex === index ? "step" : undefined}
                className="group grid h-11 w-7 place-items-center"
              >
                <span
                  className={`block h-0.5 w-5 rounded-full transition-colors duration-[var(--dur-ui)] ${
                    slideIndex === index
                      ? "bg-signal"
                      : "bg-hairline-strong group-hover:bg-ink-subtle"
                  }`}
                />
              </button>
            ))}
          </div>
          <Button disabled={index === SLIDES.length - 1} onClick={() => step(1)}>
            Next
            <Chevron direction="right" />
          </Button>
        </div>
      </nav>
    </main>
  );
}
