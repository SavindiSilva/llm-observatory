export function StatusBadge({ status }: { status: string }) {
  const isSuccess = status === "success";
  const color = isSuccess ? "var(--status-good)" : "var(--status-critical)";
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      {isSuccess ? (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
      {isSuccess ? "Success" : "Error"}
    </span>
  );
}
