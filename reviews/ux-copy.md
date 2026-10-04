# UX + copy review — Ship60

Reviewer role: final-year B.Tech student in a tier-2/3 college in Telangana/AP, arriving from a
WhatsApp link on a low-end Android phone (390×844). TomTom: PRD §1, §4.2 M1/M3/M7, §5; AGENTS
rules 5/7/9. Read-only review; no code or config changed.

Method: `npm run dev` on `http://localhost:5174` (5173 was an older, concurrently-used server),
Playwright chromium in isolated contexts at 390×844. Walked `/` (chips → project card → empty and
bad-input submits → real registration → seat ticket → `/me` → `/r/:code`), `/leaderboard`,
`/plan` (all 5 slides + print header), `/build`, `/admin` (logged in with the WS9 test password),
`/live`, `/submit`, `/cert/:id`. Axe (`color-contrast`, `button-name`, `label`) run on
`/`, `/leaderboard`, `/plan`, `/submit`, `/me?t=bad`, `/admin`, `/live`. Screenshots:
`/tmp/ship60-review/iso-*.png`. D1 inspected read-only via `wrangler d1 execute --local`.

Counts: **1 Critical, 6 High, 14 Medium, 8 Low.**

---

## Critical

### C1. Every real registrant loses their project — Launchpad, share copy and OG cards fall back to placeholders
This is the campaign's core promise ("seeing their project before they register", PRD §1.3 / M1)
breaking after registration.
- `RegistrationForm.tsx:244` posts `ideaKey: idea.key`, i.e. WS2's format
  `idea:{branch}:{interest}:{variant}`. Verified stored row:
  `idea_key = idea:CSE/IT/AI-ML:placements:0`.
- `src/worker/lib/idea-card.ts:33` parses only `branch|interest[|variant]`, so `/api/me` returns
  `idea: null`. Observed on a real registration: the Launchpad shows the literal fallback
  **"Your first AI project"** (screenshot `iso-05-launchpad-full.png`) even though the seat ticket
  had just shown "Placement Prep Buddy".
- `src/worker/routes/og.ts:83-84` has the same bug (splits on `[|:]` and reads
  `branch="idea", interest="CSE/IT/AI-ML"`), so `/r/:code` previews say
  "Ravi T. is building their first AI project" and the PNG card says "My first AI project".
- `src/client/pages/me/share.ts:22-25` receives `project: null` and the English WhatsApp message
  becomes **"Mine is an AI project."** — verified in the generated `wa.me` URL.
- The seed hides this because WS8 wrote bank-format keys (`branch|interest`, DECISIONS WS8.5), and
  DECISIONS WS1.7 even records the wrong assumption ("WS2 stores keys as `branch|interest`").
- Concrete fix: normalise in `resolveIdeaCard` and `projectTitle` —
  `key.replace(/^idea:/, "").split(/[|:]/)` — or store the bank key at registration. Add a test
  that registers through `POST /api/register` with a real `ideaKey` and asserts
  `/api/me.idea.title` and the `/r/:code` OG title.
- Suggested fallback copy while fixing: if no project resolves, drop the clause instead of
  "Mine is an AI project." → "I'm building my first AI project live this Sunday in 60 minutes
  (free, by NxtWave). Join with my link: {link}"

---

## High

### H1. The generated project card is below the fold on the target phone
At 390×844 the card's bounding box was `y=892` — after tapping both chips, nothing visible
changes except a subtly highlighted chip (`Hero.tsx:90-132`; screenshots `iso-01`/`iso-03`). The
student must scroll past the CTA to discover the hook they were promised. PRD M1 says the hero *is*
the project preview.
- Concrete: on mobile render the card between the two chip groups and the "Save my seat" CTA
  (desktop keeps the two-column sticky layout), or scroll the card into view / show a compact
  "Your project is ready ↓" strip.

### H2. Stale validation errors never clear after the field is fixed
After an empty submit, filling the name left all six red borders and messages in place
(`RegistrationForm.tsx:190-204` validates only in `onSubmit`; there is no per-field clear). In the
real walkthrough the user saw "Please enter your full name." next to a correctly filled name
(screenshot `iso-02b-form-after-fixing-name.png`).
- Concrete: clear `errors[field]` in each `onChange` (or on blur), and clear `submitError` when a
  field is edited.

### H3. Reminder copy sent to students contains ambassador instructions and a registration CTA
`buildReminderMessage` (`src/worker/cron.ts:56-67`) produces one message that includes the internal
label "D-1 evening:", "Register: {url}" and "Ambassadors: paste this message in your class groups
(ask the group admin first)." — and `sendReminderEmails` (`cron.ts:147-181`) emails that exact
message to every non-simulated registrant. A registered student gets told to register and given
instructions for ambassadors. With zero real colleges it also prints
"N students from **0 colleges**" (`cron.ts:56-59`).
- Concrete: build two variants — a student email ("Your workshop starts Sunday, 11 Oct at 7 PM
  IST. Join from your Launchpad: {url}") and an ambassador paste ("{n} students from {c} colleges
  already joined — post in your class group between 8 and 10 PM"). Guard the social line with
  `colleges > 0`.

### H4. Admin war room fails WCAG AA contrast on its small labels (axe: serious, many nodes)
`text-[#2E333B]/60` at 11-12px measured **3.7:1** on white (`admin/sections.tsx:37-38, 82-84,
347-373`; also the admin login line). Axe reported 12+ violations on `/admin`; one on the login
screen. PRD §5 and §7 require AA.
- Concrete: use `/70` minimum (~4.96:1) or a dedicated muted token, and re-run axe after login.

### H5. `/plan` uses all-caps eyebrow labels, which PRD §5 explicitly forbids
Computed style on every slide kicker is `text-transform: uppercase` (`plan/slides.tsx:30-36`), and
the deck header is uppercase too (`PlanPage.tsx:76`): "SHIP60 · GROWTH PLAN", "SLIDE 1 · THE
STUDENT" (screenshot `iso-08-plan-slide1.png`). The kicker also duplicates the chrome line "Slide 1
of 5 — The student".
- Concrete: delete the kicker (the chrome already announces the slide) or set it sentence case
  without `uppercase`/`tracking-widest`.

### H6. The FOMO share message is self-contradictory at rank #1 and silently mislabeled when rank is missing
With CBIT at #1 (real registration), the generated message was: "CBIT is at #1 on the leaderboard
for NxtWave's AI build workshop. … **Let's push us up**" (`share.ts:28-33`). You cannot push up
from #1. When `collegeRank` is null (college blank / unranked), `whatsappMessage("fomo")` returns
the plain English message (`share.ts:34`), but the button still says "Share on WhatsApp · FOMO"
and analytics records `fomo` (`share.ts:72-76`) — A/B stats are then wrong.
- Concrete: branch on rank — "#1 … help us stay on top"; "We're at #N … let's climb"; and when
  rank is null, hide the FOMO button or label it "English (leaderboard not ready)" instead of
  silently reusing another variant.

---

## Medium

### M1. "An LLM API" is jargon for this audience (all 48 ideas)
`src/shared/idea-bank.ts:27` and every bank entry list tools as e.g. `"An LLM API"`. A final-year
student who "uses ChatGPT" does not know what an LLM API is.
- Concrete: "A free AI API (ChatGPT-style)" or "A free AI key we'll set up in minute 5".

### M2. Internal labels leak onto the project card
`ProjectCard.tsx:76-78` prints "Written for you just now" / **"From the Ship60 idea bank"**. The
second is internal vocabulary and only ever appears when AI failed (always in dev).
- Concrete: "Made for you just now" / "A ready-made starter — make it yours".

### M3. "1 referrals" grammar bug in reward tiers
`LaunchpadPage.tsx:244-248` builds `{tier.minReferrals} {tier.on === "qualified" ? "check-ins" : "referrals"}`; the rendered Launchpad reads
**"AI Project Prompt Pack · 1 referrals"** (screenshot `iso-05`).
- Concrete: pluralise with `min === 1 ? "referral" : "referrals"`.

### M4. Raw referral statuses shown to students ("pending", "rejected")
`me/ui.tsx:92-107` maps only `qualified` → "checked in"; the other two render the database words in
lowercase. Seeing "rejected" next to a friend's name is harsh and unclear.
- Concrete: `pending` → "Not checked in yet"; `rejected` → "Not counted".

### M5. The `te` message opens with "Bro" and the variant is labelled "FOMO" jargon
`share.ts:26-27` starts "Bro, Sunday 60 mins lo …" in every context, including ambassador kits and
mixed class groups. The romanised Telugu is otherwise natural for this audience, but "Bro" assumes
a male recipient, and unlike `en` it never names the project. The button label "FOMO"
(`share.ts:75`) is growth-team shorthand no student uses.
- Concrete: neutral opener that keeps the code-mix voice, e.g. "Hi! Sunday 60 mins lo oka AI
  project build chesi live deploy cheddam. Free workshop, NxtWave vaallu. Nenu register ayya,
  nuvvu kuda join avvu: {link}". Rename the button "College leaderboard" (or "Campus pride") and
  "Telugu" stays.

### M6. Which Sunday? The hero and footer never give the date
`Hero.tsx:38` and the footer (`LandingPage.tsx:90`) say "Sunday, 7 PM IST"; only the lower stats
section gives "Sunday, 11 October" (`Sections.tsx:6-19`). Arriving on Monday, the student cannot
tell whether it's the coming Sunday.
- Concrete: reuse `formatWorkshopDate()` in the hero and footer: "Free NxtWave workshop · Sun 11
  Oct, 7 PM IST".

### M7. Dark mode is partial; most pages stay light in a dark system theme
Dark tokens exist (`design/tokens.css:107-117`) and work on `/` and `/live`, but `/me`,
`/leaderboard`, `/plan`, `/build`, `/admin`, `/submit` paint fixed light colors
(`me/ui.tsx:19` `bg-[#FBFCFE]`, `PlanPage.tsx:59`). Measured under `prefers-color-scheme: dark`:
`/leaderboard`, `/plan`, `/me` still `rgb(251,252,254)`. PRD §5 says dark mode via tokens.
- Concrete: swap `me/ui.tsx` and the fixed-`#FBFCFE` pages to the design-system utilities
  (`bg-paper`, `text-graphite`, `border-rule`); this is already the open "design-system swap"
  request (`TASKS.md:44`), but the dark-mode regression is the user-visible part.

### M8. `/plan` slide 2-4 helper text fails AA (axe: 4.16:1)
`slides.tsx:106-112` (and repeated on slides 3-5) uses `text-[11px] text-[#6E7BA6]` on white —
axe measured 4.16:1, below 4.5. Same color is used on `/build` footer.
- Concrete: `#5A6472` (≈6:1) or `text-graphite/70`.

### M9. Dev scaffolding copy on the student submit result
`SubmitPage.tsx:181-185` shows: "Share card image arrives with the next deploy of the OG service.
The link above always works." A student should never read the team's deploy state / internal name
"OG service".
- Concrete: delete the paragraph, or "Your share card opens as an image — download and post it on
  LinkedIn."

### M10. Certificates show the raw workshop id
`CertPage.tsx:74-77` and the SSR page (`submissions.ts:333`) render "Workshop: ship60-2026-10-11".
- Concrete: "Workshop: 11 October 2026, 7 PM IST" (same formatter as elsewhere).

### M11. `/plan` and `/build` break the design language (different font, 1px cards, all-caps table heads)
Both pages use the system sans stack and inline `#FBFCFE/#2E333B/#DDE5F2` instead of the token
utilities (`PlanPage.tsx:58-59`, `BuildPage.tsx` header/table), so the public deck the reviewers
open after the landing feels like a different product. The `tracking-widest uppercase` labels
(`PlanPage.tsx:76`, `BuildPage.tsx` h4 at line ~103) repeat the PRD §5 all-caps violation.
- Concrete: apply `font-display`/`font-body`, `bg-paper`, `border-rule`, sentence-case headings.

### M12. Admin funnel presents impossible conversions and a broken "current day"
On the seeded+test local DB the war room shows "Registered 59 — 310.5%", "Form started 19 —
105.6%" (counts not monotonic) and "Current day: — of 7" (`sections.tsx:226-250`; screenshot
`iso-17-admin-warroom.png`). A reviewer reading the funnel sees nonsense and distrusts the panel.
- Concrete: order/clamp the funnel (or compute per-unique-user steps), show "—" as "Day 0 (before
  launch)" or hide it, and cap displayed conversion at 100% with a footnote when data mixes event
  sources.

### M13. Duplicate fallback screen claims a message was sent that never is
`RegistrationForm.tsx:329-331`: "The same link was sent to the email or WhatsApp number you
registered with." No send path exists on registration (only the optional cron/Resend reminders),
and the normal duplicate response is a 200 `isReturning` seat ticket, so this screen is a dead-end
fallback that lies if reached.
- Concrete: "Use the button below to open your Launchpad. Lost the link? Register again with the
  same details and we'll show it again."

### M14. Landing counters will look empty in the seeded demo
`/api/stats/public` excludes simulated rows (`public.ts:489-511`) and PRD M1 says real data — but
in the seeded demo the landing showed "Registrations 48 · **Colleges represented 0**" while the
leaderboard is a full 50-row campus race with a label. "Students are already signing up" next to
a near-zero counter undercuts the social proof the campaign is built on.
- Concrete: keep the honesty rule but label the block ("Live registrations from real students")
  and hide the colleges stat until non-zero, or include seeded rows with the existing "Simulated
  data" badge (the leaderboard already does this).

---

## Low

### L1. "Set" button on the live guest name field
`LivePage.tsx:120-127` — a name input followed by "Set" is unclear.
- Concrete: "Join as guest".

### L2. Leaderboard abbreviations and date casing
`LeaderboardPage.tsx:162-164` headers "Regs"/"Amb." (public page) and the date reads
"Sun, 11 Oct, 7:00 pm" without IST, while the landing writes "7:00 PM IST" and the Launchpad
"7:00 pm IST" (`format.ts:7-21`).
- Concrete: "Registrations"/"Ambassadors"; standardise on "7:00 PM IST".

### L3. Co-host placeholders talk to the team, not the student
`Sections.tsx:273-297`: six tiles reading "Club co-host slot" plus "Logos land here as each one
confirms." Useful for the demo, confusing on a live student page.
- Concrete: hide the section until at least one club confirms, or "Co-host slots are open — run a
  tech club? Mention it when you register."

### L4. Two identical 3-up rounded-card grids on the landing
`Sections.tsx:111-124` (Walk away) and `Sections.tsx:179-201` (Who it's for) use the same
rounded-xl card pattern PRD §5 says to avoid; the lab-notebook identity lives only in the project
card. Low because the rest of the page is calm and ruled.
- Concrete: render one of the two as a ruled list/table under the margin line.

### L5. Admin flags show raw reason codes
`admin/sections.tsx:494-502` renders `ip_velocity` / `disposable_email` in mono
(`public.ts:237-238`). Concrete: map to "Too many signups from one network" / "Disposable email
domain".

### L6. E2E fixture rows appear on the public leaderboard
Observed rows "Ravi E. — E2E Test College" mixed into the top 50 when e2e/smoke run against the
demo DB. Concrete: run e2e against a separate DB or add a test-account marker excluded from the
public board.

### L7. Success copy assumes a project was chosen
`RegistrationForm.tsx:289-293`: "We saved your seat and your project." is false when the student
submits without selecting chips (allowed by the form).
- Concrete: "We saved your seat. Pick your project before Sunday and it'll be waiting in your
  Launchpad."

### L8. Ticket says a live link is already in the Launchpad
`RegistrationForm.tsx:299` detail: "…the live link is in your Launchpad". The deployed project
doesn't exist until the student ships it; the workshop link lives at `/live`.
- Concrete: "Free NxtWave workshop · Sunday, 7 PM IST · join from your Launchpad".

---

## Verified good

- **First 30 seconds**: hero loads fast, headline and two chip groups are clear; "Save my seat"
  repeats in header/hero and lands on the form; consent text is specific (DPDP-style) and the
  "Takes about 30 seconds. Free, no card, no sales pitch." line sets expectations.
- **Registration flow**: one-pass form with only 6 fields, +91 prefix, typeahead college with
  "Other: type it", real Turnstile loading with a graceful "Verification couldn't load" fallback;
  success screen "Seat N is yours" + ticket + "Open my Launchpad now"; duplicate returns the
  existing seat (verified 200 `isReturning`); phone/email duplicate resolution works.
- **Validation messages** themselves are concrete and human ("Enter a valid 10-digit mobile
  number.", "Pick your college, or choose "Other: type it".").
- **Referral loop**: `/r/:code` sets the first-touch cookie, logs `referral_landing` and redirects
  to `/?ref=CODE` (verified 200 → `/?ref=RAVIPGK`), and the OG page has title/description/image
  copy a classmate would click.
- **Honesty labels**: leaderboard "Simulated data — This board includes seeded demo rows.", admin
  persistent banner + include/exclude toggle, `/plan` slide badges, footer line, README caveats.
- **Empty/error/loading states** are specific: launchpad invalid token, leaderboard "The board is
  taking a break", live "Connecting…/Reconnecting…", submit "Checking your project…", referral
  "No one yet. Drop your link in one class group — that is how most seats fill."
- **Design system on the landing**: paper/ink/margin tokens, red margin rule on the hero, ruled
  lab-notebook project card as the single orchestrated "written" moment, reduced-motion zeroed
  globally, visible 3px ink focus ring (verified computed style), dark mode works on `/` and
  `/live`.
- **Ambassador kit**: personal link with copy fallback, three messages, "Best posting window:
  8–10 PM", and a genuinely respectful checklist ("Ask the group admin before posting — it takes
  one message.") — the strongest copy in the app.
- **Buttons say what happens**: "Save my seat", "Show me another", "Copy my link", "Share on
  WhatsApp", "Download story image for Instagram", "I'm here — check in", "I shipped it", "Check
  my project".
- **Axe** found no contrast/name/label violations on `/`, `/leaderboard`, `/plan` slide 1,
  `/submit`, `/me?t=bad`, `/live` at 390×844 (violations start once admin's muted labels and plan
  slides 2+ are on screen — see H4/M8).
