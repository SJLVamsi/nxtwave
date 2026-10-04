/**
 * WS8 — /plan: the 5-slide growth plan as an HTML deck (PRD M12).
 * Keyboard (←/→/space), touch swipe, dots, and a print stylesheet that turns
 * Cmd+P into 5 clean A4-landscape pages with no navigation chrome.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { SLIDES } from "./deck";

const DECK_CSS = `
.plan-slide > div { min-height: calc(100vh - 11rem); }
.plan-slide { display: none; }
.plan-slide[data-current="true"] { display: block; }

@media print {
  @page { size: A4 landscape; margin: 8mm; }
  html, body { background: #ffffff !important; }
  .plan-chrome { display: none !important; }
  .plan-shell { min-height: 0 !important; }
  .plan-deck { max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .plan-slide { display: block !important; break-after: page; page-break-after: always; }
  .plan-slide:last-of-type { break-after: auto; page-break-after: auto; }
  .plan-slide > div { min-height: 0 !important; }
  .plan-slide a { color: inherit !important; text-decoration: none !important; }
}
`;

export default function PlanPage() {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

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
      className="plan-shell min-h-screen bg-[#FBFCFE] text-[#2E333B]"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const delta =
          (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) > 40) step(delta < 0 ? 1 : -1);
      }}
    >
      <style>{DECK_CSS}</style>

      <header className="plan-chrome sticky top-0 z-10 border-b border-[#DDE5F2] bg-[#FBFCFE]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#1F3A93] uppercase">
              Ship60 · growth plan
            </p>
            <p className="text-sm text-[#2E333B]">
              Slide {index + 1} of {SLIDES.length} — {current.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded border border-[#1F3A93] px-3 py-1.5 text-sm font-medium text-[#1F3A93] hover:bg-[#F4F7FD]"
            >
              Print / save PDF
            </button>
          </div>
        </div>
      </header>

      <div className="plan-deck mx-auto max-w-6xl px-4 py-6">
        {SLIDES.map((slide, slideIndex) => {
          const Slide = slide.Component;
          return (
            <section
              key={slide.id}
              className="plan-slide"
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
        className="plan-chrome plan-dots fixed inset-x-0 bottom-0 border-t border-[#DDE5F2] bg-[#FBFCFE]/95 backdrop-blur"
        aria-label="Deck navigation"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={index === 0}
            className="rounded border border-[#DDE5F2] px-3 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            ← Previous
          </button>
          <div className="flex items-center gap-2">
            {SLIDES.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setIndex(slideIndex)}
                aria-label={`Go to slide ${slideIndex + 1}: ${slide.label}`}
                aria-current={slideIndex === index ? "true" : undefined}
                className={`h-3 w-3 rounded-full border ${
                  slideIndex === index
                    ? "border-[#1F3A93] bg-[#1F3A93]"
                    : "border-[#6E7BA6] bg-transparent"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={index === SLIDES.length - 1}
            className="rounded border border-[#DDE5F2] px-3 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </nav>
    </main>
  );
}
