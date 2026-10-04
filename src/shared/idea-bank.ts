/**
 * Static idea bank — hand-checked fallback for the AI idea engine.
 * One idea per branch × interest combination (6 × 8 = 48), all buildable by a
 * beginner in 60 minutes with no-code/low-code + an LLM API, no paid services,
 * no hardware. WS2 may extend this file via a TASKS.md request to the orchestrator.
 */
import type { Branch, Interest } from "./constants";

export interface BankIdea {
  title: string;
  pitch: string;
  steps: [string, string, string];
  tools: string[];
  deployLine: string;
}

export const IDEA_BANK: Record<string, BankIdea> = {
  "CSE/IT/AI-ML|cricket": {
    title: "Gully Cricket Commentator",
    pitch:
      "Paste a score and get a 30-second commentary script in Harsha-style energy, ready to send to your group.",
    steps: [
      "One input box for the score line and who is playing",
      "A prompt template that turns it into commentary beats",
      "A copy button and a share-ready card",
    ],
    tools: ["HTML + a little CSS", "An LLM API", "GitHub Pages or Cloudflare Pages"],
    deployLine: "You deploy it live and paste the link in your class group tonight.",
  },
  "CSE/IT/AI-ML|movies": {
    title: "Movie Night Decider",
    pitch:
      "Pick a mood, language and who you're watching with, and get one movie plus a two-line reason — no more scrolling.",
    steps: [
      "Three dropdowns: mood, language, company",
      "An LLM call that must return one pick and one reason",
      "A 'give me another' button",
    ],
    tools: ["React or plain HTML", "An LLM API", "Netlify/Cloudflare Pages"],
    deployLine: "Deployed before the credits of the movie you'll now actually pick.",
  },
  "CSE/IT/AI-ML|placements": {
    title: "Placement Prep Buddy",
    pitch:
      "Paste any job description and get the 10 most likely interview questions, grouped by round.",
    steps: [
      "Paste-JD textarea with a max length",
      "Prompt that returns questions as a numbered list",
      "Copy-as-checklist button for revision",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "A live link you can open in the interview waiting room.",
  },
  "CSE/IT/AI-ML|food": {
    title: "Hostel Mess Menu Fixer",
    pitch:
      "Type tonight's mess menu and get a quick upgrade, a rough calorie guess and one swap to ask the mess anna for.",
    steps: [
      "Textarea for the menu items",
      "Prompt for upgrade + calorie estimate",
      "A short output card with the one swap highlighted",
    ],
    tools: ["HTML + CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed in time for dinner, with a screenshot for the group.",
  },
  "CSE/IT/AI-ML|money": {
    title: "Pocket Money Coach",
    pitch:
      "Enter your monthly allowance and one goal, and get a week-by-week split you can actually follow.",
    steps: [
      "Two inputs: amount and goal",
      "Prompt for a simple weekly plan in plain language",
      "A table view with a 'copy plan' button",
    ],
    tools: ["React or vanilla JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live link you can bookmark before the month runs out.",
  },
  "CSE/IT/AI-ML|music": {
    title: "Playlist Poet",
    pitch:
      "Describe your mood in one line and get a 5-song playlist concept with captions for your story.",
    steps: [
      "Mood input plus language preference",
      "LLM returns songs + one caption per song",
      "A story-card layout ready for screenshots",
    ],
    tools: ["HTML/CSS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Deploy it, screenshot it, post it — all in the same hour.",
  },
  "CSE/IT/AI-ML|college life": {
    title: "Bunk Planner 3000",
    pitch:
      "Enter your attendance percentage and the class you want to skip, and get an honest yes/no with the math shown.",
    steps: [
      "Inputs: attendance %, classes held, classes attended",
      "A tiny calculation + LLM explanation",
      "A verdict card: safe / risky / don't",
    ],
    tools: ["Plain HTML/JS", "An LLM API", "GitHub Pages"],
    deployLine: "Live before the next lecture, used during it.",
  },
  "CSE/IT/AI-ML|health": {
    title: "Late-Night Sleep Coach",
    pitch:
      "Tell it your wake-up time and current sleep habit, and get a 7-day wind-down plan that survives hostel life.",
    steps: [
      "Inputs: wake time, current bedtime, caffeine habit",
      "Prompt for a 7-day plan in short bullets",
      "Checkbox list you can tick through the week",
    ],
    tools: ["HTML + CSS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Deployed and pinned to your home screen by lights-out.",
  },
  "ECE|cricket": {
    title: "Cricket Stats Storyteller",
    pitch:
      "Paste a scorecard and get the three numbers that actually decided the match, explained like a friend.",
    steps: [
      "Textarea for scorecard stats",
      "Prompt that picks the three decisive numbers",
      "Output card with a 'share to group' button",
    ],
    tools: ["HTML/JS", "An LLM API", "GitHub Pages"],
    deployLine: "Live before the post-match group call ends.",
  },
  "ECE|movies": {
    title: "Sci-Fi Science Checker",
    pitch:
      "Paste a movie scene's science claim and get a 'real / half-true / nonsense' verdict with a one-line explanation.",
    steps: [
      "Input box for the scene description",
      "Prompt for verdict + explanation + a real-world example",
      "Colour-coded verdict card",
    ],
    tools: ["HTML + CSS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Deployed with a link you can drop in the movie club group.",
  },
  "ECE|placements": {
    title: "VLSI/Embedded Interview Flash Cards",
    pitch:
      "Generate 12 flash cards from any topic (e.g. 'setup and hold time') with question on the front, answer on the back.",
    steps: [
      "Topic input and difficulty selector",
      "Prompt that returns Q/A pairs as JSON",
      "Flip-card UI you can revise with",
    ],
    tools: ["React or vanilla JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live flash cards on your phone before the next mock round.",
  },
  "ECE|food": {
    title: "Hostel Kettle Recipes",
    pitch:
      "Tell it what you have (maggi, milk, bread, an iron) and get one recipe you can actually make in a hostel room.",
    steps: [
      "Ingredient checkboxes",
      "Prompt that must respect 'no kitchen' constraints",
      "Recipe card with a steps checklist",
    ],
    tools: ["HTML/JS", "An LLM API", "GitHub Pages"],
    deployLine: "Live link, then dinner.",
  },
  "ECE|money": {
    title: "Gadget Upgrade Advisor",
    pitch:
      "Enter your current phone/laptop and budget, and get an honest 'upgrade now or wait' call with reasons.",
    steps: [
      "Two inputs: current device, budget",
      "Prompt for verdict + 3 reasons + one alternative",
      "Verdict card with a comparison table",
    ],
    tools: ["HTML + CSS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Deployed before you open the shopping app again.",
  },
  "ECE|music": {
    title: "Lo-Fi Focus Mixer",
    pitch:
      "Pick your study subject and stress level, and get a lo-fi setlist plan plus a matching pomodoro schedule.",
    steps: [
      "Subject + stress inputs",
      "Prompt for setlist mood + 4 pomodoro blocks",
      "A timer-style layout with the plan",
    ],
    tools: ["HTML/JS", "An LLM API", "GitHub Pages"],
    deployLine: "Live link you keep open while you study.",
  },
  "ECE|college life": {
    title: "Lab Report Simplifier",
    pitch:
      "Paste your lab procedure and get a plain-English explanation plus the three viva questions most likely to come.",
    steps: [
      "Textarea for the procedure",
      "Prompt for summary + viva questions",
      "Two-column output: explanation / questions",
    ],
    tools: ["HTML/CSS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Deployed before the viva, used during it.",
  },
  "ECE|health": {
    title: "Screen-Time Eye Coach",
    pitch:
      "Enter your daily screen hours and get a realistic 20-20-20 routine plus hostel-friendly eye exercises.",
    steps: [
      "Slider for daily screen hours",
      "Prompt for a routine with timings",
      "Checklist with reminder copy button",
    ],
    tools: ["HTML/JS", "An LLM API", "GitHub Pages"],
    deployLine: "Live on your phone, where the screen time happens.",
  },
  "EEE|cricket": {
    title: "Powerplay Score Predictor",
    pitch:
      "Paste the first 6 overs score and get a projected total with the assumption explained — a talking point, not a betting tool.",
    steps: [
      "Inputs: score, wickets, venue size",
      "A simple projection formula + LLM explanation",
      "Share card with the prediction and timestamp",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Deployed in the innings break.",
  },
  "EEE|movies": {
    title: "Movie Power Budget",
    pitch:
      "List the gadgets a movie hero uses and get a realistic battery/power budget for their day — pure fun, real physics.",
    steps: [
      "Checklist of gadgets from a preset list",
      "Prompt for watt-hour estimates and a verdict",
      "A fun 'would it survive?' score card",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Live before the sequel releases.",
  },
  "EEE|placements": {
    title: "Core Company Question Map",
    pitch:
      "Pick a core company (BHEL, TATA Power, etc.) and get the 10 topics they actually ask, ranked by frequency.",
    steps: [
      "Company dropdown",
      "Prompt for ranked topics with one sample question each",
      "Checklist layout for tracking prep",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Deployed as your placement-season checklist.",
  },
  "EEE|food": {
    title: "Iron-Box Grilled Sandwich Coach",
    pitch:
      "Tell it your ingredients and get a hostel-safe recipe with timings that won't trip the room's fuse.",
    steps: [
      "Ingredient inputs",
      "Prompt constrained to hostel appliances",
      "Recipe card with a safety note",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Live, then eaten.",
  },
  "EEE|money": {
    title: "Electricity Bill Explainer",
    pitch:
      "Paste your home bill's units and charges and get a plain-language breakdown plus where the money actually goes.",
    steps: [
      "Inputs: units consumed, slab rate",
      "A small slab calculator + LLM explanation",
      "Pie-style summary card (CSS only)",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before the next bill shocks someone at home.",
  },
  "EEE|music": {
    title: "Speaker Setup Helper",
    pitch:
      "Enter your room size and speaker placement, and get the best cheap setup with a diagram in words.",
    steps: [
      "Room dimensions + current placement inputs",
      "Prompt for placement advice and a sketch",
      "A simple ASCII/CSS diagram card",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed before the hostel party.",
  },
  "EEE|college life": {
    title: "Attendance Shortage Alarm",
    pitch:
      "Enter your timetable and attendance, and get the exact classes you cannot miss this month to stay above 75%.",
    steps: [
      "Inputs: total classes, attended, classes per week",
      "Calculator for the minimum safe attendance",
      "A 'missable' calendar view for the month",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before the month's first bunk.",
  },
  "EEE|health": {
    title: "Hostel Fan-Heat Advisor",
    pitch:
      "Enter room heat conditions and get practical cooling tips, hydration schedule and sleep positioning for hot nights.",
    steps: [
      "Inputs: room type, fan position, water intake",
      "Prompt for practical, zero-cost fixes",
      "A night routine checklist",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed before the next power cut.",
  },
  "Mech|cricket": {
    title: "Bowling Action Analyzer",
    pitch:
      "Describe a bowler's action in words and get a biomechanics-style read plus two drills to fix the weakness.",
    steps: [
      "Textarea describing the action",
      "Prompt for analysis + drills",
      "Output card with drill checklist",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before the next nets session.",
  },
  "Mech|movies": {
    title: "Movie Car Reality Check",
    pitch:
      "Paste a movie car chase move and get a 'physically possible?' verdict with the forces involved in simple numbers.",
    steps: [
      "Input box for the stunt",
      "Prompt for verdict + simplified physics",
      "Verdict card with a fun score",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed with a share card for the group.",
  },
  "Mech|placements": {
    title: "CAD Portfolio Prompt Coach",
    pitch:
      "Describe your best CAD project and get a portfolio-ready description plus the three questions an interviewer will ask.",
    steps: [
      "Textarea for project details",
      "Prompt for a polished description + questions",
      "Copy-ready output blocks",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before your next internship application.",
  },
  "Mech|food": {
    title: "Pressure Cooker Timing Buddy",
    pitch:
      "Pick what you're cooking and get exact whistles, water ratio and a safety reminder — no more guessing.",
    steps: [
      "Dish dropdown + quantity",
      "Prompt for timings and ratios",
      "Big timer-style card with steps",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed before the first whistle.",
  },
  "Mech|money": {
    title: "Bike Service Cost Estimator",
    pitch:
      "Enter your bike model and symptoms and get a likely service list with fair price ranges so you don't get overcharged.",
    steps: [
      "Inputs: model, km, symptoms",
      "Prompt for likely fixes + price bands",
      "A quote-comparison card",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before the next service visit.",
  },
  "Mech|music": {
    title: "Workshop Rhythm Playlist",
    pitch:
      "Get a focus playlist plan for a workshop/lab session based on the task type and noise level.",
    steps: [
      "Task + noise-level inputs",
      "Prompt for a setlist and volume guidance",
      "A simple session timeline card",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed before the lab slot starts.",
  },
  "Mech|college life": {
    title: "Workshop Viva Answer Trainer",
    pitch:
      "Paste your workshop job details and get the five viva questions examiners love, with model answers.",
    steps: [
      "Textarea for the job/process",
      "Prompt for viva Q&A",
      "Flip-card revision UI",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before the viva bell.",
  },
  "Mech|health": {
    title: "Lab Posture Coach",
    pitch:
      "Describe your lab/desk setup and get five fixes for back and wrist pain with a 2-minute stretch routine.",
    steps: [
      "Inputs: setup description, pain points",
      "Prompt for fixes + stretches",
      "Checklist with a 2-minute timer",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed before the next long lab.",
  },
  "Civil|cricket": {
    title: "Stadium Pitch Report Generator",
    pitch:
      "Enter pitch conditions and weather and get a broadcast-style pitch report with what it means for batters and bowlers.",
    steps: [
      "Inputs: surface, weather, toss time",
      "Prompt for a 60-word pitch report",
      "Share card with a copy button",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before the toss.",
  },
  "Civil|movies": {
    title: "Movie Building Inspector",
    pitch:
      "Describe a movie building or stunt and get a 'would this stand?' verdict with the structural reason in one line.",
    steps: [
      "Input box for the scene",
      "Prompt for verdict + simple structural reasoning",
      "Verdict card with a fun rating",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed with a share card for the movie group.",
  },
  "Civil|placements": {
    title: "Site Visit Story Builder",
    pitch:
      "Describe a site visit and get an interview-ready STAR story plus the technical term to drop correctly.",
    steps: [
      "Textarea for the site visit",
      "Prompt for a STAR story + 3 technical terms",
      "Copy-ready story blocks",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before the next interview round.",
  },
  "Civil|food": {
    title: "Hostel Water Quality Checker",
    pitch:
      "Answer four questions about your hostel water and get a practical filter/boil plan with a simple risk rating.",
    steps: [
      "Four yes/no questions",
      "Prompt for a risk rating + action plan",
      "A simple traffic-light result card",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed before the next refill.",
  },
  "Civil|money": {
    title: "PG vs Hostel Cost Comparator",
    pitch:
      "Enter rent, food and travel numbers for two options and get a true monthly cost comparison with a recommendation.",
    steps: [
      "Two-column number inputs",
      "Calculator + LLM recommendation",
      "Comparison card with the monthly delta",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before you sign anything.",
  },
  "Civil|music": {
    title: "Study Room Acoustics Fixer",
    pitch:
      "Describe your room and get three zero-cost changes to make music and lectures sound better.",
    steps: [
      "Inputs: room type, surfaces, speaker position",
      "Prompt for practical fixes",
      "Before/after suggestion card",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed before the next study session.",
  },
  "Civil|college life": {
    title: "Campus Walk-Time Calculator",
    pitch:
      "Pick two campus locations and get the walk time plus the latest minute you can leave and still make attendance.",
    steps: [
      "Two dropdowns of campus spots + your speed",
      "A simple distance/time calculator + LLM tip",
      "A 'leave by' card with a countdown",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before the next 9 AM lecture.",
  },
  "Civil|health": {
    title: "Hostel Dust & Allergy Advisor",
    pitch:
      "Describe your room and symptoms and get a cleaning routine plus cheap fixes that actually reduce dust.",
    steps: [
      "Inputs: room type, symptoms, cleaning frequency",
      "Prompt for a routine and fixes",
      "Weekly checklist card",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed before the next cleaning day.",
  },
  "Other|cricket": {
    title: "Match Prediction Group Bot Script",
    pitch:
      "Paste both teams and the venue and get a pre-match prediction post your group will argue about.",
    steps: [
      "Two team inputs + venue",
      "Prompt for a prediction + one spicy take",
      "Copy-to-WhatsApp card",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Deployed before the first ball.",
  },
  "Other|movies": {
    title: "Spoiler-Free Review Writer",
    pitch:
      "Type the movie and your one-line reaction and get a spoiler-free review for your story or group.",
    steps: [
      "Movie + reaction inputs",
      "Prompt for a 60-word spoiler-free review",
      "Story-card layout with copy button",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed before the post-credits scene ends.",
  },
  "Other|placements": {
    title: "HR Answer Rehearser",
    pitch:
      "Answer one common HR question in your own words and get feedback plus a stronger version, without sounding fake.",
    steps: [
      "Question dropdown + your answer textarea",
      "Prompt for feedback + improved answer",
      "Side-by-side comparison card",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before the next HR round.",
  },
  "Other|food": {
    title: "Canteen Budget Meal Picker",
    pitch:
      "Enter your budget and hunger level and get the best canteen combo with a rough protein guess.",
    steps: [
      "Budget + hunger inputs",
      "Prompt for a combo + protein estimate",
      "Menu-style result card",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed before the lunch rush.",
  },
  "Other|money": {
    title: "First Salary Split Planner",
    pitch:
      "Enter an expected first salary and get a split across needs, wants and savings with a one-year goal.",
    steps: [
      "Salary input + one goal",
      "Prompt for a percentage split + reasoning",
      "Visual split card with copy button",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before the offer letter arrives.",
  },
  "Other|music": {
    title: "Antakshari Starter Generator",
    pitch:
      "Pick a letter and language and get five songs to start a hostel antakshari night.",
    steps: [
      "Letter + language inputs",
      "Prompt for five songs with the starting word",
      "Big-card layout for reading across the room",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed before the first round ends.",
  },
  "Other|college life": {
    title: "Club Event Poster Copywriter",
    pitch:
      "Describe your club event and get poster copy, a WhatsApp blurb and a LinkedIn line — all in one click.",
    steps: [
      "Event details form",
      "Prompt for three copy formats",
      "Tabbed output with copy buttons",
    ],
    tools: ["HTML/JS", "An LLM API", "Cloudflare Pages"],
    deployLine: "Live before the poster goes to print.",
  },
  "Other|health": {
    title: "Hostel Workout Generator",
    pitch:
      "Pick your time and energy level and get a no-equipment workout you can do between two beds.",
    steps: [
      "Time + energy inputs",
      "Prompt for a circuit with rest timings",
      "Timer-style card with tick boxes",
    ],
    tools: ["HTML/CSS", "An LLM API", "GitHub Pages"],
    deployLine: "Deployed before the motivation disappears.",
  },
};

export function bankKey(branch: Branch | string, interest: Interest | string): string {
  return `${branch}|${interest}`;
}

export function getBankIdea(branch: Branch | string, interest: Interest | string): BankIdea {
  const idea = IDEA_BANK[bankKey(branch, interest)];
  if (idea) return idea;
  return IDEA_BANK["Other|college life"];
}
