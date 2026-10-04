/**
 * WS8 — deck definition for /plan. Kept separate from slides.tsx so the slide
 * module exports only components (react-refresh) and this module exports data.
 */
import type { ReactNode } from "react";
import { Slide1Student, Slide2Insight, Slide3Math, Slide4Calendar, Slide5Built } from "./slides";

export interface SlideDef {
  id: string;
  label: string;
  Component: () => ReactNode;
}

export const SLIDES: readonly SlideDef[] = [
  { id: "student", label: "The student", Component: Slide1Student },
  { id: "insight", label: "Insight & channels", Component: Slide2Insight },
  { id: "math", label: "The math & budget", Component: Slide3Math },
  { id: "calendar", label: "7-day plan", Component: Slide4Calendar },
  { id: "built", label: "What we built", Component: Slide5Built },
];
