import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FilterBar } from "../components/FilterBar";
import { LoadingState } from "../components/LoadingState";
import { Pagination } from "../components/Pagination";
import { ProviderBadge } from "../components/ProviderBadge";
import { StatusBadge } from "../components/StatusBadge";
import { useAsync } from "../hooks/useAsync";
import { getLogs, getModels } from "../lib/api";
import { formatCost, formatDateTime, formatLatency, formatNumber, truncate } from "../lib/format";

const PAGE_SIZE = 20;

export function History() {
  const navigate = useNavigate();
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);

  const logsState = useAsync(
    () =>
      getLogs({
        provider: provider || undefined,
        model: model || undefined,
        status: status || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
    [provider, model, status, offset],
  );
  const modelsState = useAsync(getModels, []);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setOffset(0);
  }

  const hasActiveFilters = provider !== "" || model !== "" || status !== "";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Request history</h1>
        <p className="text-sm text-[var(--text-muted)]">Every logged request across both providers.</p>
      </div>

      <FilterBar
        provider={provider}
        model={model}
        status={status}
        models={modelsState.data ?? []}
        onProviderChange={(v) => updateFilter(setProvider, v)}
        onModelChange={(v) => updateFilter(setModel, v)}
        onStatusChange={(v) => updateFilter(setStatus, v)}
        onClear={() => {
          setProvider("");
          setModel("");
          setStatus("");
          setOffset(0);
        }}
      />

      {logsState.loading && <LoadingState label="Loading requests…" />}

      {!logsState.loading && logsState.error && (
        <ErrorState message={logsState.error} onRetry={logsState.refetch} />
      )}

      {!logsState.loading && !logsState.error && logsState.data && logsState.data.total === 0 && (
        <EmptyState
          title={hasActiveFilters ? "No requests match these filters" : "No requests logged yet"}
          description={
            hasActiveFilters
              ? "Try clearing a filter to see more results."
              : "Send a prompt through the API's /chat or /compare endpoint to start populating history."
          }
        />
      )}

      {!logsState.loading && !logsState.error && logsState.data && logsState.data.total > 0 && (
        <div className="card min-w-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--hairline)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Provider</th>
                  <th className="px-4 py-2.5 font-medium">Model</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">Prompt</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Tokens</th>
                  <th className="px-4 py-2.5 text-right font-medium">Latency</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {logsState.data.items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/history/${item.id}`)}
                    className="cursor-pointer border-b border-[var(--hairline)] transition last:border-0 hover:bg-[var(--hairline)]"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)] tabular-nums">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <ProviderBadge provider={item.provider} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--text-secondary)]">{item.model}</td>
                    <td className="hidden px-4 py-2.5 text-[var(--text-primary)] md:table-cell">
                      {truncate(item.prompt, 60)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)] tabular-nums">
                      {formatNumber(item.total_tokens)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)] tabular-nums">
                      {formatLatency(item.latency_ms)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-secondary)] tabular-nums">
                      {formatCost(item.estimated_cost_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--hairline)] px-4 py-3">
            <Pagination
              offset={offset}
              limit={PAGE_SIZE}
              total={logsState.data.total}
              onPrev={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              onNext={() => setOffset((o) => o + PAGE_SIZE)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
