import { useId, type SelectHTMLAttributes } from "react";
import { fieldControlClass, fieldDescribedBy, fieldLabelClass, FieldMessages } from "./field";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly SelectOption[];
  hint?: string;
  error?: string | null;
  placeholder?: string;
}

export function Select({
  label,
  options,
  hint,
  error,
  placeholder,
  id,
  className,
  required,
  value,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const describedBy = fieldDescribedBy(selectId, hint, error);
  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className={fieldLabelClass}>
        {label}
        {required ? (
          <span className="text-ink-subtle" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <select
        id={selectId}
        required={required}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={fieldControlClass(error, className)}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessages id={selectId} hint={hint} error={error} />
    </div>
  );
}
