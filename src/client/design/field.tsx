import { cn } from "./cn";

/** ids for hint/error paragraphs that a control points at with aria-describedby. */
export function fieldDescribedBy(
  id: string,
  hint?: string,
  error?: string | null,
): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function FieldMessages({
  id,
  hint,
  error,
}: {
  id: string;
  hint?: string;
  error?: string | null;
}) {
  if (!hint && !error) return null;
  return (
    <>
      {hint ? (
        <p id={`${id}-hint`} className="text-body-sm text-ink-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

export const fieldLabelClass = "block text-label text-ink-muted";

export function fieldControlClass(error?: string | null, className?: string): string {
  return cn(
    "min-h-11 w-full rounded-control border bg-surface-1 px-3 py-2 font-sans text-base text-ink",
    "placeholder:text-ink-subtle",
    "focus-visible:border-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/40",
    "disabled:cursor-not-allowed disabled:opacity-45",
    error ? "border-danger" : "border-hairline hover:border-hairline-strong",
    className,
  );
}
