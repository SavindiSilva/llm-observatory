import { useState } from "react";

import { ComparePanel, type PanelState } from "../components/ComparePanel";
import { TargetPicker } from "../components/TargetPicker";
import { useAsync } from "../hooks/useAsync";
import { getErrorMessage, getModels, postChat } from "../lib/api";
import { providerLabel } from "../lib/format";
import type { LLMRequestOut, ModelOut, Provider } from "../lib/types";

interface Target {
  provider: Provider;
  model: string;
}

function modelLabel(models: ModelOut[], provider: string, model: string): string {
  return models.find((m) => m.provider === provider && m.name === model)?.display_name ?? model;
}

function buildTakeaway(a: LLMRequestOut, b: LLMRequestOut, models: ModelOut[]): string | null {
  if (a.status !== "success" || b.status !== "success") return null;

  const nameA = `${providerLabel(a.provider)} (${modelLabel(models, a.provider, a.model)})`;
  const nameB = `${providerLabel(b.provider)} (${modelLabel(models, b.provider, b.model)})`;

  const cheaper =
    a.estimated_cost_usd === b.estimated_cost_usd
      ? null
      : a.estimated_cost_usd < b.estimated_cost_usd
        ? { winner: nameA, pct: (1 - a.estimated_cost_usd / b.estimated_cost_usd) * 100 }
        : { winner: nameB, pct: (1 - b.estimated_cost_usd / a.estimated_cost_usd) * 100 };

  const faster =
    a.latency_ms === b.latency_ms
      ? null
      : a.latency_ms < b.latency_ms
        ? { winner: nameA, pct: (1 - a.latency_ms / b.latency_ms) * 100 }
        : { winner: nameB, pct: (1 - b.latency_ms / a.latency_ms) * 100 };

  if (!cheaper && !faster) return "Both models cost and responded in about the same time for this prompt.";

  if (cheaper && faster && cheaper.winner === faster.winner) {
    return `${cheaper.winner} was ${cheaper.pct.toFixed(0)}% cheaper and ${faster.pct.toFixed(0)}% faster than the other for this prompt.`;
  }

  const parts: string[] = [];
  if (cheaper) parts.push(`${cheaper.winner} was ${cheaper.pct.toFixed(0)}% cheaper`);
  if (faster) parts.push(`${faster.winner} was ${faster.pct.toFixed(0)}% faster`);
  return `${parts.join(", while ")} for this prompt.`;
}

export function Compare() {
  const modelsState = useAsync(getModels, []);
  const models = modelsState.data ?? [];

  const [prompt, setPrompt] = useState("");
  const [targetAOverride, setTargetAOverride] = useState<Target | null>(null);
  const [targetBOverride, setTargetBOverride] = useState<Target | null>(null);
  const [panelA, setPanelA] = useState<PanelState>({ status: "idle" });
  const [panelB, setPanelB] = useState<PanelState>({ status: "idle" });
  const [groupId, setGroupId] = useState<string | null>(null);

  const defaultA = models.find((m) => m.provider === "groq");
  const defaultB = models.find((m) => m.provider === "gemini");
  const targetA = targetAOverride ?? (defaultA ? { provider: "groq" as Provider, model: defaultA.name } : null);
  const targetB = targetBOverride ?? (defaultB ? { provider: "gemini" as Provider, model: defaultB.name } : null);

  const isSubmitting = panelA.status === "loading" || panelB.status === "loading";
  const canSubmit = Boolean(targetA && targetB && prompt.trim()) && !isSubmitting;

  function runTarget(target: Target, gid: string, setPanel: (state: PanelState) => void) {
    setPanel({ status: "loading" });
    postChat({ provider: target.provider, model: target.model, prompt, comparison_group_id: gid })
      .then((data) => setPanel({ status: "done", data }))
      .catch((err: unknown) => setPanel({ status: "error", message: getErrorMessage(err) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetA || !targetB || !prompt.trim()) return;
    const gid = crypto.randomUUID();
    setGroupId(gid);
    runTarget(targetA, gid, setPanelA);
    runTarget(targetB, gid, setPanelB);
  }

  const takeaway =
    panelA.status === "done" && panelB.status === "done" ? buildTakeaway(panelA.data, panelB.data, models) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Model comparison</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Send the same prompt to two models side by side and compare latency, tokens, and cost.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="compare-prompt" className="text-xs font-medium text-[var(--text-muted)]">
            Prompt
          </label>
          <textarea
            id="compare-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Ask something to compare both models…"
            className="resize-none rounded-lg border border-[var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-groq)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {targetA && (
            <TargetPicker
              label="Target A"
              provider={targetA.provider}
              model={targetA.model}
              models={models}
              disabled={isSubmitting}
              onChange={(provider, model) => setTargetAOverride({ provider, model })}
            />
          )}
          {targetB && (
            <TargetPicker
              label="Target B"
              provider={targetB.provider}
              model={targetB.model}
              models={models}
              disabled={isSubmitting}
              onChange={(provider, model) => setTargetBOverride({ provider, model })}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="self-start rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--series-groq)" }}
        >
          {isSubmitting ? "Comparing…" : "Compare"}
        </button>
      </form>

      {(panelA.status !== "idle" || panelB.status !== "idle") && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {targetA && (
            <ComparePanel
              provider={targetA.provider}
              model={targetA.model}
              state={panelA}
              onRetry={() => groupId && runTarget(targetA, groupId, setPanelA)}
            />
          )}
          {targetB && (
            <ComparePanel
              provider={targetB.provider}
              model={targetB.model}
              state={panelB}
              onRetry={() => groupId && runTarget(targetB, groupId, setPanelB)}
            />
          )}
        </div>
      )}

      {takeaway && (
        <div className="card px-5 py-4 text-sm text-[var(--text-primary)]">
          <span className="font-medium">Takeaway: </span>
          {takeaway}
        </div>
      )}
    </div>
  );
}
