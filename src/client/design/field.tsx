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
        <p id={`${id}-hint`} className="text-sm text-graphite/70">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-bold text-margin">
          {error}
        </p>
      ) : null}
    </>
  );
}

export const fieldLabelClass = "block text-sm font-bold text-graphite";

export function fieldControlClass(error?: string | null, className?: string): string {
  return cn(
    "min-h-11 w-full rounded-lg border bg-surface px-3 py-2 font-body text-base text-graphite",
    "placeholder:text-graphite/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink",
    "disabled:cursor-not-allowed disabled:opacity-60",
    error ? "border-margin" : "border-rule",
    className,
  );
}
