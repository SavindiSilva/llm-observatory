import { formatNumber } from "../lib/format";

interface PaginationProps {
  offset: number;
  limit: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({ offset, limit, total, onPrev, onNext }: PaginationProps) {
  if (total === 0) return null;

  const start = offset + 1;
  const end = Math.min(offset + limit, total);
  const canPrev = offset > 0;
  const canNext = end < total;

  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-[var(--text-muted)]">
        Showing {formatNumber(start)}–{formatNumber(end)} of {formatNumber(total)}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="rounded-lg border border-[var(--hairline)] bg-[var(--surface-1)] px-3 py-1.5 font-medium text-[var(--text-primary)] transition hover:bg-[var(--hairline)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="rounded-lg border border-[var(--hairline)] bg-[var(--surface-1)] px-3 py-1.5 font-medium text-[var(--text-primary)] transition hover:bg-[var(--hairline)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
