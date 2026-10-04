import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  BRANCHES,
  CONSENT_TEXT,
  DEFAULT_GRAD_YEAR,
  GRAD_YEARS,
  type Branch,
  type WhatsAppVariant,
} from "../../../shared/constants";
import type { CollegeOption, IdeaCard, RegisterRequest } from "../../../shared/contracts";
import {
  Button,
  buttonClass,
  Input,
  Select,
  Ticket,
  Typeahead,
  type TypeaheadOption,
} from "../../design";
import { ApiError, fetchColleges, register } from "./api";
import { trackEvent, type UtmParams } from "./analytics";
import { loadTurnstile, TURNSTILE_SITE_KEY, type TurnstileApi } from "./turnstile";
import { useQuery } from "@tanstack/react-query";

const OTHER_COLLEGE_ID = "__other__";

function findLaunchpadUrl(error: ApiError): string | null {
  const body = error.body as Record<string, unknown> | null;
  if (body) {
    const direct = body.launchpadUrl;
    if (typeof direct === "string" && direct.length > 0) return direct;
    const nested = (body.error as Record<string, unknown> | undefined)?.launchpadUrl;
    if (typeof nested === "string" && nested.length > 0) return nested;
  }
  const match = error.message.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}

function validPhone(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value);
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export interface RegistrationFormProps {
  idea: IdeaCard | null;
  refCode?: string;
  shareVariant?: WhatsAppVariant;
  utm: UtmParams;
}

type FieldErrors = Partial<
  Record<"name" | "email" | "phone" | "college" | "collegeOther" | "branch" | "consent", string>
>;

export function RegistrationForm({ idea, refCode, shareVariant, utm }: RegistrationFormProps) {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState<Branch | "">("");
  const [gradYear, setGradYear] = useState<number>(DEFAULT_GRAD_YEAR);
  const [consent, setConsent] = useState(false);

  const [college, setCollege] = useState<{ id: string; label: string } | null>(null);
  const [collegeOtherMode, setCollegeOtherMode] = useState(false);
  const [collegeOther, setCollegeOther] = useState("");
  const [debouncedCollegeQuery, setDebouncedCollegeQuery] = useState("");
  const collegeTimerRef = useRef<number | null>(null);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ code: string; message: string } | null>(null);
  const [duplicateUrl, setDuplicateUrl] = useState<string | null | undefined>(undefined);
  const [success, setSuccess] = useState<{
    seatNo: number;
    token: string;
    isReturning: boolean;
  } | null>(null);
  const formStartedRef = useRef(false);

  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileState, setTurnstileState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetRef = useRef<string | null>(null);

  const colleges = useQuery({
    queryKey: ["colleges", debouncedCollegeQuery],
    queryFn: ({ signal }) => fetchColleges(debouncedCollegeQuery, signal),
    enabled: debouncedCollegeQuery.length >= 2,
    staleTime: 60_000,
    retry: 0,
  });

  useEffect(
    () => () => {
      if (collegeTimerRef.current !== null) window.clearTimeout(collegeTimerRef.current);
    },
    [],
  );

  // Turnstile is needed only when the form scrolls into view; load it then.
  useEffect(() => {
    const container = turnstileContainerRef.current;
    if (!container) return;
    let cancelled = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setTurnstileState("loading");
        loadTurnstile()
          .then(() => {
            if (cancelled || !window.turnstile || !turnstileContainerRef.current) return;
            const api: TurnstileApi = window.turnstile;
            turnstileWidgetRef.current = api.render(turnstileContainerRef.current, {
              sitekey: TURNSTILE_SITE_KEY,
              theme: window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light",
              size: "flexible",
              callback: (token) => {
                setTurnstileToken(token);
                setTurnstileState("ready");
              },
              "expired-callback": () => {
                setTurnstileToken("");
                setTurnstileState("idle");
              },
              "error-callback": () => setTurnstileState("error"),
            });
          })
          .catch(() => {
            if (!cancelled) setTurnstileState("error");
          });
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(container);
    return () => {
      cancelled = true;
      observer.disconnect();
      const widgetId = turnstileWidgetRef.current;
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // Widget already gone; nothing to clean up.
        }
        turnstileWidgetRef.current = null;
      }
    };
  }, []);

  function resetTurnstile() {
    setTurnstileToken("");
    const widgetId = turnstileWidgetRef.current;
    if (widgetId && window.turnstile) {
      try {
        window.turnstile.reset(widgetId);
      } catch {
        // Reset is best effort.
      }
    }
  }

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => {
      navigate(`/me?t=${encodeURIComponent(success.token)}`);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [success, navigate]);

  const collegeOptions: TypeaheadOption[] = (colleges.data ?? []).map(
    (option: CollegeOption) => ({
      id: option.id,
      label: option.name,
      sublabel: option.city ?? undefined,
    }),
  );

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (name.trim().length < 2) next.name = "Please enter your full name.";
    if (!validEmail(email.trim())) next.email = "Enter a valid email address.";
    if (!validPhone(phone)) next.phone = "Enter a valid 10-digit mobile number.";
    if (!college && !collegeOtherMode) {
      next.college = "Pick your college, or choose “Other: type it”.";
    }
    if (collegeOtherMode && collegeOther.trim().length < 2) {
      next.collegeOther = "Type your college name.";
    }
    if (!branch) next.branch = "Pick your branch.";
    if (!consent) next.consent = "Please agree before saving your seat.";
    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const fieldErrors = validate();
    setErrors(fieldErrors);
    const firstError = (Object.keys(fieldErrors) as Array<keyof FieldErrors>)[0];
    if (firstError) {
      const elementId =
        firstError === "college"
          ? "reg-college"
          : firstError === "collegeOther"
            ? "reg-college-other"
            : `reg-${firstError}`;
      document.getElementById(elementId)?.focus();
      return;
    }

    if (turnstileState === "ready" && !turnstileToken) {
      setSubmitError({
        code: "TURNSTILE_WAIT",
        message: "The quick verification is still running — try again in a second.",
      });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setDuplicateUrl(undefined);

    const payload: RegisterRequest = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: `+91${phone}`,
      ...(college ? { collegeId: college.id } : {}),
      ...(collegeOtherMode && collegeOther.trim() ? { collegeOther: collegeOther.trim() } : {}),
      branch: branch as Branch,
      gradYear,
      ...(idea ? { ideaKey: idea.key } : {}),
      ...(turnstileToken ? { turnstileToken } : {}),
      ...(refCode ? { refCode } : {}),
      ...(shareVariant ? { shareVariant } : {}),
      consent: true,
      ...utm,
    };

    try {
      const result = await register(payload);
      setSuccess({ seatNo: result.seatNo, token: result.token, isReturning: result.isReturning });
      trackEvent(
        "registered",
        {
          seatNo: result.seatNo,
          refCode: result.refCode,
          ideaKey: idea?.key,
          isReturning: result.isReturning,
          ...(refCode ? { referredBy: refCode } : {}),
        },
        utm,
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === "DUPLICATE") {
        setDuplicateUrl(findLaunchpadUrl(error));
      } else if (error instanceof ApiError) {
        setSubmitError({ code: error.code, message: error.message });
      } else {
        setSubmitError({
          code: "NETWORK",
          message: "Network hiccup — check your connection and try again.",
        });
      }
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-xl" aria-live="polite">
        <h3 className="font-display font-stretch-expanded text-2xl font-black text-graphite">
          Seat {success.seatNo} is yours
        </h3>
        <p className="mt-2 text-graphite/80">
          {success.isReturning
            ? "Welcome back — your seat was already saved. Taking you to your Launchpad."
            : "We saved your seat and your project. Taking you to your Launchpad."}
        </p>
        <Ticket
          className="mt-5"
          seatNo={success.seatNo}
          name={name.trim()}
          projectTitle={idea?.title ?? null}
          detail="Free NxtWave workshop · Sunday, 7 PM IST · the live link is in your Launchpad"
          footer={
            <Link
              to={`/me?t=${encodeURIComponent(success.token)}`}
              className={buttonClass({ variant: "primary", size: "md" })}
            >
              Open my Launchpad now
            </Link>
          }
        />
      </div>
    );
  }

  if (duplicateUrl !== undefined) {
    return (
      <div className="max-w-xl" role="alert">
        <h3 className="font-display font-stretch-expanded text-2xl font-black text-graphite">
          You&rsquo;re already registered
        </h3>
        <p className="mt-2 text-graphite/80">
          That email or WhatsApp number already has a seat and a project. Open your Launchpad to
          see it.
        </p>
        <Link
          to={duplicateUrl ?? "/me"}
          className={buttonClass({ variant: "primary", size: "lg", className: "mt-5" })}
        >
          Open my Launchpad
        </Link>
        <p className="mt-3 text-sm text-graphite/70">
          The same link was sent to the email or WhatsApp number you registered with.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="rounded-xl border border-rule bg-surface px-5 py-6 sm:px-6">
        <h3 className="font-display font-stretch-expanded text-2xl font-black text-graphite">
          Save my seat
        </h3>
        <p className="mt-2 text-sm text-graphite/75">
          {idea
            ? `Your project: ${idea.title}`
            : "Your project gets picked in the first five minutes — you can also tap the chips above first."}
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={onSubmit}
          noValidate
          onFocusCapture={() => {
            if (formStartedRef.current) return;
            formStartedRef.current = true;
            trackEvent("form_started", { hasIdea: Boolean(idea) }, utm);
          }}
        >
          <Input
            id="reg-name"
            data-testid="register-name"
            label="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
            autoComplete="name"
            placeholder="As it should appear on your certificate"
            required
          />

          <Input
            id="reg-email"
            data-testid="register-email"
            label="Email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />

          <Input
            id="reg-phone"
            data-testid="register-phone"
            label="WhatsApp number"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
            error={errors.phone}
            autoComplete="tel-national"
            placeholder="10-digit mobile number"
            leading="+91"
            hint="Workshop reminders come here."
            required
          />

          <Typeahead
            id="reg-college"
            label="College"
            placeholder="Start typing your college name"
            selected={college}
            options={collegeOptions}
            otherOption={{ id: OTHER_COLLEGE_ID, label: "Other: type it" }}
            loading={colleges.isFetching}
            error={errors.college}
            onQueryChange={(query) => {
              if (collegeTimerRef.current !== null) window.clearTimeout(collegeTimerRef.current);
              collegeTimerRef.current = window.setTimeout(
                () => setDebouncedCollegeQuery(query.trim()),
                250,
              );
            }}
            onSelect={(option) => {
              if (option.id === OTHER_COLLEGE_ID) {
                setCollege(null);
                setCollegeOtherMode(true);
                return;
              }
              setCollege({ id: option.id, label: option.label });
              setCollegeOtherMode(false);
              setCollegeOther("");
              setErrors((current) => ({ ...current, college: undefined }));
            }}
            onClearSelection={() => {
              setCollege(null);
              setCollegeOtherMode(false);
            }}
          />

          {collegeOtherMode ? (
            <Input
              id="reg-college-other"
              label="Your college name"
              value={collegeOther}
              onChange={(event) => setCollegeOther(event.target.value)}
              error={errors.collegeOther}
              autoComplete="organization"
              placeholder="Type the full college name"
              required
            />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="reg-branch"
              label="Branch"
              value={branch}
              onChange={(event) => setBranch(event.target.value as Branch | "")}
              error={errors.branch}
              placeholder="Pick your branch"
              options={BRANCHES.map((item) => ({ value: item, label: item }))}
              required
            />
            <Select
              id="reg-grad-year"
              label="Graduation year"
              value={String(gradYear)}
              onChange={(event) => setGradYear(Number(event.target.value))}
              options={GRAD_YEARS.map((year) => ({ value: String(year), label: String(year) }))}
              hint="Used to keep the workshop relevant to you."
            />
          </div>

          <div>
            <label
              htmlFor="reg-consent"
              className="flex items-start gap-3 rounded-lg border border-rule bg-paper/60 px-3 py-3"
            >
              <input
                id="reg-consent"
                data-testid="register-consent"
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? "reg-consent-error" : undefined}
                className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
                required
              />
              <span className="text-sm leading-6 text-graphite/80">{CONSENT_TEXT}</span>
            </label>
            {errors.consent ? (
              <p id="reg-consent-error" role="alert" className="mt-1.5 text-sm font-bold text-margin">
                {errors.consent}
              </p>
            ) : null}
          </div>

          <div
            ref={turnstileContainerRef}
            className="min-h-16"
            role="group"
            aria-label="Human verification"
          >
            {turnstileState === "error" ? (
              <p className="text-sm text-graphite/70">
                Verification couldn&rsquo;t load. You can still submit — we&rsquo;ll double-check
                server-side, or refresh if it keeps failing.
              </p>
            ) : null}
          </div>

          {submitError ? (
            <div
              role="alert"
              className="rounded-lg border border-margin/60 bg-margin/5 px-3 py-3 text-sm font-bold text-margin"
            >
              {submitError.message}
              {submitError.code === "RATE_LIMITED" ? (
                <span className="mt-1 block font-normal text-graphite/75">
                  Your seat isn&rsquo;t lost — wait a few minutes and try again.
                </span>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" size="lg" fullWidth loading={submitting} data-testid="register-submit">
            {submitting ? "Saving your seat…" : "Save my seat"}
          </Button>
          <p className="text-center text-xs text-graphite/70">
            By saving your seat you agree to the consent note above. We never post on your behalf.
          </p>
        </form>
      </div>
    </div>
  );
}
