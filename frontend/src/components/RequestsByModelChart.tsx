import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatNumber, providerLabel } from "../lib/format";

export interface ModelBarDatum {
  model: string;
  displayName: string;
  provider: string;
  retired: boolean;
  count: number;
}

interface RequestsByModelChartProps {
  data: ModelBarDatum[];
}

function seriesColor(provider: string): string {
  if (provider === "groq") return "var(--series-groq)";
  if (provider === "gemini") return "var(--series-gemini)";
  return "var(--text-muted)";
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ModelBarDatum }[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-[var(--text-primary)]">
        {item.displayName}
        {item.retired && <span className="text-[var(--text-muted)]"> (retired)</span>}
      </p>
      <p className="text-[var(--text-secondary)]">{providerLabel(item.provider)}</p>
      <p className="text-[var(--text-secondary)]">
        Requests: <span className="font-medium text-[var(--text-primary)]">{formatNumber(item.count)}</span>
      </p>
      {item.retired && (
        <p className="mt-1 text-[var(--text-muted)]">No longer available for new requests.</p>
      )}
    </div>
  );
}

export function RequestsByModelChart({ data }: RequestsByModelChartProps) {
  const height = Math.max(120, data.length * 44);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="displayName"
            axisLine={false}
            tickLine={false}
            width={140}
            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--hairline)" }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry) => (
              <Cell key={entry.model} fill={seriesColor(entry.provider)} fillOpacity={entry.retired ? 0.4 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--series-groq)" }} aria-hidden="true" />
          Groq
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--series-gemini)" }} aria-hidden="true" />
          Gemini
        </span>
        {data.some((d) => d.retired) && (
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--text-muted)", opacity: 0.5 }}
              aria-hidden="true"
            />
            Faded = retired model
          </span>
        )}
      </div>
    </div>
  );
}
