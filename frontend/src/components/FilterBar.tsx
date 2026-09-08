import type { ModelOut } from "../lib/types";

interface FilterBarProps {
  provider: string;
  model: string;
  status: string;
  models: ModelOut[];
  onProviderChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClear: () => void;
}

const selectClass =
  "rounded-lg border border-[var(--hairline)] bg-[var(--surface-1)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-groq)]";

export function FilterBar({
  provider,
  model,
  status,
  models,
  onProviderChange,
  onModelChange,
  onStatusChange,
  onClear,
}: FilterBarProps) {
  const modelOptions = provider ? models.filter((m) => m.provider === provider) : models;
  const hasFilters = provider !== "" || model !== "" || status !== "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selectClass}
        value={provider}
        onChange={(e) => {
          onProviderChange(e.target.value);
          onModelChange("");
        }}
        aria-label="Filter by provider"
      >
        <option value="">All providers</option>
        <option value="groq">Groq</option>
        <option value="gemini">Gemini</option>
      </select>

      <select
        className={selectClass}
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        aria-label="Filter by model"
      >
        <option value="">All models</option>
        {modelOptions.map((m) => (
          <option key={m.name} value={m.name}>
            {m.display_name}
            {m.retired ? " (retired)" : ""}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        <option value="success">Success</option>
        <option value="error">Error</option>
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
