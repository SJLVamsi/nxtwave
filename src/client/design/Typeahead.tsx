import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "./cn";
import { fieldControlClass, fieldDescribedBy, fieldLabelClass, FieldMessages } from "./field";

export interface TypeaheadOption {
  id: string;
  label: string;
  sublabel?: string;
}

export interface TypeaheadProps {
  label: string;
  id?: string;
  options: readonly TypeaheadOption[];
  selected: TypeaheadOption | null;
  onSelect: (option: TypeaheadOption) => void;
  onQueryChange: (query: string) => void;
  /** Clear the current selection (the user is typing again). */
  onClearSelection: () => void;
  /** Extra row appended to the list, e.g. { id: "__other__", label: "Other: type it" }. */
  otherOption?: TypeaheadOption;
  loading?: boolean;
  error?: string | null;
  hint?: string;
  placeholder?: string;
  emptyText?: string;
}

export function Typeahead({
  label,
  id: idProp,
  options,
  selected,
  onSelect,
  onQueryChange,
  onClearSelection,
  otherOption,
  loading = false,
  error,
  hint,
  placeholder,
  emptyText = "No matches. Pick “Other: type it”.",
}: TypeaheadProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listboxId = `${id}-listbox`;
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionId = (index: number) => `${id}-option-${index}`;

  // Keep the input text in step with a selection made by the parent without an
  // effect: adjust state during render, the documented prev-prop pattern.
  const [prevSelected, setPrevSelected] = useState(selected);
  if (prevSelected !== selected) {
    setPrevSelected(selected);
    setQuery(selected?.label ?? "");
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const allOptions = useMemo(
    () => (otherOption ? [...options, otherOption] : [...options]),
    [options, otherOption],
  );

  function commit(option: TypeaheadOption) {
    onSelect(option);
    setQuery(option.label);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      if (allOptions.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        const next = current + delta;
        if (next < 0) return allOptions.length - 1;
        if (next >= allOptions.length) return 0;
        return next;
      });
      return;
    }
    if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      const option = allOptions[activeIndex];
      if (option) commit(option);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const describedBy = fieldDescribedBy(id, hint, error);
  const showList = open;
  const activeOption = activeIndex >= 0 ? allOptions[activeIndex] : undefined;

  return (
    <div className="space-y-1.5" ref={rootRef}>
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption ? optionId(activeIndex) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            if (selected) onClearSelection();
            onQueryChange(next);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(fieldControlClass(error), "pr-9")}
        />
        {selected ? (
          <button
            type="button"
            aria-label="Change selection"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-graphite/70 hover:text-graphite"
            onClick={() => {
              onClearSelection();
              setQuery("");
              onQueryChange("");
              setOpen(true);
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none">
              <path
                d="m4 4 8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
        {showList ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-rule bg-surface py-1 shadow-lg"
          >
            {loading ? (
              <li className="px-3 py-2 text-sm text-graphite/70" aria-live="polite">
                Searching colleges…
              </li>
            ) : null}
            {!loading && allOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-graphite/70">{emptyText}</li>
            ) : null}
            {allOptions.map((option, index) => (
              <li
                key={option.id}
                id={optionId(index)}
                role="option"
                aria-selected={selected?.id === option.id}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm",
                  index === activeIndex ? "bg-ink/10" : "hover:bg-ink/5",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(option)}
              >
                <span className="block font-bold text-graphite">{option.label}</span>
                {option.sublabel ? (
                  <span className="block text-xs text-graphite/70">{option.sublabel}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}
