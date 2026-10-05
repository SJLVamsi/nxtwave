import type { ReactNode } from "react";

/**
 * War-room primitives. The console is hairlines and density, not a card grid:
 * a section is a rule, a title row and content; tables are real tables on
 * desktop and stacked label:value rows on phones (DESIGN.md §7).
 */

export function Section({
  title,
  meta,
  aside,
  children,
  testId,
  className = "",
}: {
  title: string;
  meta?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <section data-testid={testId} className={className}>
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-hairline-strong pb-2">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {meta ? (
          <p className="min-w-0 font-mono text-[11px] text-ink-subtle tabular-nums">{meta}</p>
        ) : null}
        {aside ? <div className="ml-auto flex items-center gap-2">{aside}</div> : null}
      </header>
      <div className="pt-3">{children}</div>
    </section>
  );
}

export interface Column {
  key: string;
  label: string;
  /** Mono tabular numerals, right-aligned on the desktop table. */
  numeric?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  cell,
  empty,
}: {
  columns: Column[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  cell: (row: T, column: Column) => ReactNode;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="py-1 text-[13px] text-ink-subtle">{empty}</p>;
  }
  return (
    <>
      <dl className="md:hidden">
        {rows.map((row, index) => (
          <div key={rowKey(row, index)} className="border-b border-hairline py-2.5 last:border-b-0">
            {columns.map((column) => (
              <div key={column.key} className="flex items-baseline justify-between gap-4 py-0.5">
                <dt className="shrink-0 text-[11px] text-ink-subtle">{column.label}</dt>
                <dd
                  className={`min-w-0 break-words text-right text-[13px] text-ink ${
                    column.numeric ? "font-mono tabular-nums" : ""
                  } ${column.className ?? ""}`}
                >
                  {cell(row, column)}
                </dd>
              </div>
            ))}
          </div>
        ))}
      </dl>
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`border-b border-hairline px-4 pb-2 text-[11px] font-medium tracking-[0.01em] text-ink-subtle first:pl-0 last:pr-0 ${
                    column.numeric ? "text-right" : ""
                  } ${column.className ?? ""}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                className="border-b border-hairline transition-colors duration-[var(--dur-ui)] last:border-b-0 hover:bg-surface-1"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-2.5 align-top text-[13px] text-ink first:pl-0 last:pr-0 ${
                      column.numeric ? "font-mono tabular-nums text-right" : ""
                    } ${column.className ?? ""}`}
                  >
                    {cell(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Compact secondary control used in dense chrome (44px on touch). */
export const COMPACT_BUTTON =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-control border border-hairline " +
  "bg-surface-2 px-3 text-[12px] font-medium text-ink-muted " +
  "transition-[background-color,border-color,color,transform] duration-[var(--dur-ui)] ease-[var(--ease-out)] " +
  "hover:border-hairline-strong hover:text-ink enabled:active:scale-[0.97] " +
  "disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:min-h-11 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

/** Small status word on a hairline row. */
export function StatusText({ tone, children }: { tone: "open" | "good" | "bad"; children: string }) {
  const color =
    tone === "open" ? "text-warning" : tone === "good" ? "text-success" : "text-danger";
  return <span className={`text-[12px] ${color}`}>{children}</span>;
}
