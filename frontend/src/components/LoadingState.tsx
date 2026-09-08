interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--text-muted)]">
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--grid)] border-t-[var(--series-groq)]"
        aria-hidden="true"
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}
