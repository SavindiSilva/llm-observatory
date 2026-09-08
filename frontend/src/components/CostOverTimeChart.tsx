import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCost, formatDateShort, formatNumber } from "../lib/format";
import type { CostOverTimePoint } from "../lib/types";

interface CostOverTimeChartProps {
  points: CostOverTimePoint[];
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: CostOverTimePoint }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg" style={{ borderColor: "var(--hairline)" }}>
      <p className="mb-1 font-medium text-[var(--text-primary)]">{point.date}</p>
      <p className="text-[var(--text-secondary)]">
        Cost: <span className="font-medium text-[var(--text-primary)]">{formatCost(point.cost_usd)}</span>
      </p>
      <p className="text-[var(--text-secondary)]">
        Requests: <span className="font-medium text-[var(--text-primary)]">{formatNumber(point.requests)}</span>
      </p>
    </div>
  );
}

export function CostOverTimeChart({ points }: CostOverTimeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--seq-500)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--seq-500)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateShort}
          axisLine={{ stroke: "var(--axis)" }}
          tickLine={false}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v: number) => formatCost(v)}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          width={64}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--axis)", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="cost_usd"
          stroke="var(--seq-500)"
          strokeWidth={2}
          fill="url(#costFill)"
          dot={false}
          activeDot={{ r: 5, stroke: "var(--surface-1)", strokeWidth: 2, fill: "var(--seq-500)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
