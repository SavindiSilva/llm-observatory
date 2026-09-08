import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { ProviderBadge } from "./ProviderBadge";
import { StatusBadge } from "./StatusBadge";
import { formatCost, formatLatency, formatNumber } from "../lib/format";
import type { LLMRequestOut } from "../lib/types";

export type PanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: LLMRequestOut };

interface ComparePanelProps {
  provider: string;
  model: string;
  state: PanelState;
  onRetry: () => void;
}

export function ComparePanel({ provider, model, state, onRetry }: ComparePanelProps) {
  return (
    <div className="card flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center gap-2">
        <ProviderBadge provider={provider} />
        <span className="text-sm font-medium text-[var(--text-primary)]">{model}</span>
        {state.status === "done" && <StatusBadge status={state.data.status} />}
      </div>

      {state.status === "idle" && (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
          Send a prompt to see this model's response.
        </p>
      )}

      {state.status === "loading" && <LoadingState label="Waiting for response…" />}

      {state.status === "error" && <ErrorState message={state.message} onRetry={onRetry} />}

      {state.status === "done" && (
        <>
          <div className="grid grid-cols-3 gap-3 border-y border-[var(--hairline)] py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-[var(--text-muted)]">Latency</span>
              <span className="text-sm font-medium tabular-nums text-[var(--text-primary)]">
                {formatLatency(state.data.latency_ms)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-[var(--text-muted)]">Tokens</span>
              <span className="text-sm font-medium tabular-nums text-[var(--text-primary)]">
                {formatNumber(state.data.total_tokens)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-[var(--text-muted)]">Cost</span>
              <span className="text-sm font-medium tabular-nums text-[var(--text-primary)]">
                {formatCost(state.data.estimated_cost_usd)}
              </span>
            </div>
          </div>

          {state.data.status === "success" ? (
            state.data.response ? (
              <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{state.data.response}</p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                The model returned no visible text — its output tokens were likely spent entirely on internal
                reasoning.
              </p>
            )
          ) : (
            <p className="whitespace-pre-wrap text-sm text-[var(--status-critical)]">{state.data.error_message}</p>
          )}
        </>
      )}
    </div>
  );
}
