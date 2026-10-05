import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

export interface PacingChartPoint {
  day: number;
  date: string;
  plannedCumulative: number | null;
  actualCumulative: number | null;
}

const HAIRLINE = "var(--hairline, var(--color-hairline, #272b31))";
const HAIRLINE_STRONG = "var(--hairline-strong, var(--color-hairline-strong, #3a3f47))";
const SUBTLE = "var(--ink-subtle, var(--color-ink-subtle, #7d8590))";
const SIGNAL = "var(--signal, var(--color-signal, #c8f250))";
const SURFACE_3 = "var(--surface-3, var(--color-surface-3, #1e2227))";
const MONO = 'var(--font-mono, ui-monospace, Menlo, monospace)';
function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const planned = payload.find((entry) => entry.dataKey === "plannedCumulative");
  const actual = payload.find((entry) => entry.dataKey === "actualCumulative");
  return (
    <div
      className="rounded-[10px] border border-hairline bg-surface-3 px-3 py-2"
      style={{ boxShadow: "0 16px 40px rgba(0,0,0,.5)" }}
    >
      <p className="font-mono text-[11px] text-ink-subtle">Day {String(label)}</p>
      {actual && actual.value != null ? (
        <p className="mt-1 flex items-baseline justify-between gap-6 font-mono text-[12px] tabular-nums">
          <span className="inline-flex items-center gap-1.5 text-ink-muted">
            <span aria-hidden="true" className="h-0.5 w-2.5 rounded-full bg-signal" />
            actual
          </span>
          <span className="text-ink">{Number(actual.value).toLocaleString("en-IN")}</span>
        </p>
      ) : null}
      {planned && planned.value != null ? (
        <p className="mt-1 flex items-baseline justify-between gap-6 font-mono text-[12px] tabular-nums">
          <span className="inline-flex items-center gap-1.5 text-ink-muted">
            <span aria-hidden="true" className="h-px w-2.5 bg-hairline-strong" />
            planned
          </span>
          <span className="text-ink-muted">{Number(planned.value).toLocaleString("en-IN")}</span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Lazy-loaded (see sections.tsx) so Recharts never ships in the landing
 * bundle. Flight Deck chart: hairline grid, plan as a dashed hairline,
 * actual as the one signal line.
 */
export default function PacingChart({
  points,
  currentDay,
}: {
  points: PacingChartPoint[];
  currentDay: number;
}) {
  const maxTick = Math.max(
    60,
    ...points.map((point) => point.plannedCumulative ?? 0),
    ...points.map((point) => point.actualCumulative ?? 0),
  );
  const top = Math.ceil(maxTick / 150) * 150;
  const showToday = currentDay >= 1 && currentDay <= points.length;
  const summary = points
    .map(
      (point) =>
        `Day ${point.day}: actual ${point.actualCumulative ?? "not yet"}, planned ${
          point.plannedCumulative ?? "not yet"
        }`,
    )
    .join(". ");
  return (
    <div
      className="h-52 w-full sm:h-64"
      data-testid="pacing-chart"
      role="img"
      aria-label={`Cumulative registrations, actual against plan. ${summary}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: -14 }}>
          <CartesianGrid stroke={HAIRLINE} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={(day: number) => `D${day}`}
            tick={{ fill: SUBTLE, fontSize: 11, fontFamily: MONO }}
            tickLine={false}
            tickMargin={8}
            axisLine={{ stroke: HAIRLINE }}
          />
          <YAxis
            domain={[0, top]}
            ticks={[0, top / 4, top / 2, (top * 3) / 4, top].map((value) => Math.round(value))}
            tick={{ fill: SUBTLE, fontSize: 11, fontFamily: MONO }}
            tickLine={false}
            axisLine={false}
            width={46}
            allowDecimals={false}
          />
          <Tooltip
            content={(props) => <ChartTooltip {...props} />}
            cursor={{ stroke: HAIRLINE_STRONG, strokeWidth: 1 }}
            wrapperStyle={{ outline: "none" }}
          />
          {showToday ? (
            <ReferenceLine
              x={currentDay}
              stroke={HAIRLINE_STRONG}
              strokeDasharray="2 3"
              ifOverflow="extendDomain"
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="plannedCumulative"
            name="planned"
            stroke={HAIRLINE_STRONG}
            strokeDasharray="4 4"
            strokeWidth={1}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="actualCumulative"
            name="actual"
            stroke={SIGNAL}
            strokeWidth={2}
            strokeLinecap="round"
            dot={{ r: 2, fill: SIGNAL, stroke: SURFACE_3, strokeWidth: 1 }}
            activeDot={{ r: 4, fill: SIGNAL, stroke: SURFACE_3, strokeWidth: 2 }}
            isAnimationActive={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
