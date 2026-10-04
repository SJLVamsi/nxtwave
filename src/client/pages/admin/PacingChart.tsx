import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface PacingChartPoint {
  day: number;
  date: string;
  plannedCumulative: number | null;
  actualCumulative: number | null;
}

/** Lazy-loaded (see AdminPage) so Recharts never ships in the landing bundle. */
export default function PacingChart({ points }: { points: PacingChartPoint[] }) {
  return (
    <div className="h-60 w-full sm:h-72" data-testid="pacing-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#DDE5F2" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tickFormatter={(day: number) => `D${day}`}
            tick={{ fill: "#2E333B", fontSize: 11 }}
            stroke="#DDE5F2"
          />
          <YAxis tick={{ fill: "#2E333B", fontSize: 11 }} stroke="#DDE5F2" allowDecimals={false} />
          <Tooltip
            labelFormatter={(day) => `Day ${String(day)}`}
            contentStyle={{
              background: "#FBFCFE",
              border: "1px solid #DDE5F2",
              borderRadius: 6,
              fontSize: 12,
              color: "#2E333B",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="plannedCumulative"
            name="Planned"
            stroke="#1F3A93"
            strokeDasharray="5 4"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="actualCumulative"
            name="Actual"
            stroke="#D7263D"
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
