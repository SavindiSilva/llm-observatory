import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ProviderBadge } from "../components/ProviderBadge";
import { StatusBadge } from "../components/StatusBadge";
import { useAsync } from "../hooks/useAsync";
import { getErrorMessage, getLog, postEvaluation } from "../lib/api";
import { formatCost, formatDateTime, formatLatency, formatNumber, providerLabel } from "../lib/format";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="text-sm font-medium tabular-nums text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

type EvalActionState = { status: "idle" | "loading" } | { status: "error"; message: string };

export function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const requestId = Number(id);
  const isValidId = Number.isInteger(requestId) && requestId > 0;

  const logState = useAsync(() => getLog(requestId), [requestId]);
  const [evalAction, setEvalAction] = useState<EvalActionState>({ status: "idle" });

  if (!isValidId) {
    return <EmptyState title="Invalid request id" description="This link doesn't point to a real request." />;
  }

  if (logState.loading) {
    return <LoadingState label="Loading request…" />;
  }

  if (logState.error) {
    return <ErrorState message={logState.error} onRetry={logState.refetch} />;
  }

  const request = logState.data;
  if (!request) {
    return <EmptyState title="Request not found" description={`No request with id ${requestId}.`} />;
  }

  const canEvaluate = request.status === "success" && Boolean(request.response);

  async function handleRunEvaluation() {
    setEvalAction({ status: "loading" });
    try {
      await postEvaluation(requestId);
      setEvalAction({ status: "idle" });
      logState.refetch();
    } catch (err) {
      setEvalAction({ status: "error", message: getErrorMessage(err) });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/history" className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]">
          History
        </Link>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-[var(--text-primary)]">Request #{request.id}</span>
      </div>

      <div className="card flex flex-wrap items-center gap-3 px-5 py-4">
        <ProviderBadge provider={request.provider} />
        <span className="text-sm font-medium text-[var(--text-primary)]">{request.model}</span>
        <StatusBadge status={request.status} />
        <span className="ml-auto text-sm text-[var(--text-muted)]">{formatDateTime(request.created_at)}</span>
      </div>

      <div className="card grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
        <Field label="Input tokens" value={formatNumber(request.input_tokens)} />
        <Field label="Output tokens" value={formatNumber(request.output_tokens)} />
        <Field label="Latency" value={formatLatency(request.latency_ms)} />
        <Field label="Estimated cost" value={formatCost(request.estimated_cost_usd)} />
      </div>

      <div className="card px-5 py-4">
        <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Prompt</h2>
        <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{request.prompt}</p>
      </div>

      <div className="card px-5 py-4">
        <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          {request.status === "success" ? "Response" : "Error"}
        </h2>
        {request.status === "success" ? (
          request.response ? (
            <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{request.response}</p>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              The model returned no visible text — its {formatNumber(request.output_tokens)} output tokens were
              likely spent entirely on internal reasoning before hitting the max_tokens limit. Try a higher
              max_tokens for this model.
            </p>
          )
        ) : (
          <p className="whitespace-pre-wrap text-sm text-[var(--status-critical)]">{request.error_message}</p>
        )}
      </div>

      {canEvaluate && (
        <div className="card flex flex-col gap-4 px-5 py-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">LLM-as-judge evaluation</h2>
            <button
              type="button"
              onClick={handleRunEvaluation}
              disabled={evalAction.status === "loading"}
              className="rounded-lg border border-[var(--hairline)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--hairline)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {evalAction.status === "loading"
                ? "Evaluating…"
                : request.evaluations.length > 0
                  ? "Run another evaluation"
                  : "Run evaluation"}
            </button>
          </div>

          {evalAction.status === "error" && (
            <p className="text-sm text-[var(--status-critical)]">{evalAction.message}</p>
          )}

          {request.evaluations.length === 0 && evalAction.status !== "loading" && (
            <p className="text-sm text-[var(--text-muted)]">
              No evaluation yet. A different model will judge this response for relevance, groundedness, and
              completeness.
            </p>
          )}

          <div className="flex flex-col gap-4">
            {request.evaluations.map((evaluation) => (
              <div key={evaluation.id} className="flex flex-col gap-3 border-t border-[var(--hairline)] pt-4 first:border-0 first:pt-0">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Relevance" value={evaluation.relevance_score.toFixed(2)} />
                  <Field label="Groundedness" value={evaluation.groundedness_score.toFixed(2)} />
                  <Field label="Completeness" value={evaluation.completeness_score.toFixed(2)} />
                  <Field label="Overall" value={evaluation.overall_score.toFixed(2)} />
                </div>
                {evaluation.reasoning && (
                  <p className="text-sm text-[var(--text-secondary)]">{evaluation.reasoning}</p>
                )}
                <p className="text-xs text-[var(--text-muted)]">
                  Judged by {providerLabel(evaluation.judge_provider)} · {evaluation.judge_model}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
