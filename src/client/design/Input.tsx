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
          <span className="text-margin" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <div className={cn("flex", leading ? "items-stretch" : "")}>
        {leading ? (
          <span className="flex min-h-11 items-center rounded-l-lg border border-r-0 border-rule bg-rule/40 px-3 text-base text-graphite">
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
