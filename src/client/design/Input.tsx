import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import { fieldControlClass, fieldDescribedBy, fieldLabelClass, FieldMessages } from "./field";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  /** Static prefix rendered outside the input, e.g. +91 for phone numbers. */
  leading?: ReactNode;
}

export function Input({ label, hint, error, leading, id, required, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = fieldDescribedBy(inputId, hint, error);
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className={fieldLabelClass}>
        {label}
        {required ? (
          <span className="text-ink-subtle" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <div className={cn("flex", leading ? "items-stretch" : "")}>
        {leading ? (
          <span className="flex min-h-11 items-center rounded-l-control border border-r-0 border-hairline bg-surface-2 px-3 font-mono text-mono-data text-ink-muted">
            {leading}
          </span>
        ) : null}
        <input
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(fieldControlClass(error), leading ? "rounded-l-none" : "")}
          {...rest}
        />
      </div>
      <FieldMessages id={inputId} hint={hint} error={error} />
    </div>
  );
}
