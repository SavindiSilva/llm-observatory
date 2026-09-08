import { providerLabel } from "../lib/format";

export function ProviderBadge({ provider }: { provider: string }) {
  const color = provider === "groq" ? "var(--series-groq)" : "var(--series-gemini)";
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {providerLabel(provider)}
    </span>
  );
}
