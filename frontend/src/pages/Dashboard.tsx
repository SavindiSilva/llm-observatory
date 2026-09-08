import { useMemo } from "react";

import { CostOverTimeChart } from "../components/CostOverTimeChart";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { RequestsByModelChart, type ModelBarDatum } from "../components/RequestsByModelChart";
import { StatCard } from "../components/StatCard";
import { useAsync } from "../hooks/useAsync";
import { getCostOverTime, getMetrics, getModels } from "../lib/api";
import { formatCompactNumber, formatCost, formatLatency, formatPercent } from "../lib/format";

export function Dashboard() {
  const metricsState = useAsync(getMetrics, []);
  const costState = useAsync(() => getCostOverTime(14), []);
  const modelsState = useAsync(getModels, []);

  const modelBars = useMemo<ModelBarDatum[]>(() => {
    const byModel = metricsState.data?.requests_by_model ?? {};
    const catalog = modelsState.data ?? [];
    return Object.entries(byModel)
      .map(([model, count]) => {
        const info = catalog.find((m) => m.name === model);
        return {
          model,
          displayName: info?.display_name ?? model,
          provider: info?.provider ?? "unknown",
          count,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [metricsState.data, modelsState.data]);

  const loading = metricsState.loading || costState.loading;
  const error = metricsState.error ?? costState.error;

  if (loading) {
    return <LoadingState label="Loading dashboard…" />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          metricsState.refetch();
          costState.refetch();
          modelsState.refetch();
        }}
      />
    );
  }

  const metrics = metricsState.data;
  const cost = costState.data;

  if (!metrics || metrics.total_requests === 0) {
    return (
      <EmptyState
        title="No requests logged yet"
        description="Send a prompt through the API's /chat or /compare endpoint to start populating the dashboard. Every number here comes from a real logged request — nothing is simulated."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)]">Live usage and cost across every logged LLM request.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total requests" value={formatCompactNumber(metrics.total_requests)} />
        <StatCard
          label="Success rate"
          value={formatPercent(metrics.success_rate)}
          sublabel={`${metrics.failed_requests} failed`}
        />
        <StatCard label="Total cost" value={formatCost(metrics.total_cost_usd)} />
        <StatCard label="Avg latency" value={formatLatency(metrics.avg_latency_ms)} />
        <StatCard label="Total tokens" value={formatCompactNumber(metrics.total_tokens)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card min-w-0 px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Cost over time</h2>
          <p className="mb-2 text-xs text-[var(--text-muted)]">Last 14 days, estimated at public provider pricing.</p>
          {cost && cost.points.length > 0 ? (
            <CostOverTimeChart points={cost.points} />
          ) : (
            <EmptyState title="No cost data in this window" />
          )}
        </div>

        <div className="card min-w-0 px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Requests by model</h2>
          <p className="mb-2 text-xs text-[var(--text-muted)]">All-time request volume, colored by provider.</p>
          {modelBars.length > 0 ? (
            <RequestsByModelChart data={modelBars} />
          ) : (
            <EmptyState title="No model data yet" />
          )}
        </div>
      </div>
    </div>
  );
}
