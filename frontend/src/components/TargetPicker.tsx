import type { ModelOut, Provider } from "../lib/types";

interface TargetPickerProps {
  label: string;
  provider: Provider;
  model: string;
  models: ModelOut[];
  disabled: boolean;
  onChange: (provider: Provider, model: string) => void;
}

const selectClass =
  "rounded-lg border border-[var(--hairline)] bg-[var(--surface-1)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-groq)] disabled:cursor-not-allowed disabled:opacity-60";

export function TargetPicker({ label, provider, model, models, disabled, onChange }: TargetPickerProps) {
  const selectableModels = models.filter((m) => !m.retired);
  const modelOptions = selectableModels.filter((m) => m.provider === provider);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
      <div className="flex gap-2">
        <select
          className={selectClass}
          value={provider}
          disabled={disabled}
          onChange={(e) => {
            const nextProvider = e.target.value as Provider;
            const firstModel = selectableModels.find((m) => m.provider === nextProvider);
            onChange(nextProvider, firstModel?.name ?? "");
          }}
        >
          <option value="groq">Groq</option>
          <option value="gemini">Gemini</option>
        </select>
        <select
          className={selectClass}
          value={model}
          disabled={disabled}
          onChange={(e) => onChange(provider, e.target.value)}
        >
          {modelOptions.map((m) => (
            <option key={m.name} value={m.name}>
              {m.display_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
