interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
}

export function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="card flex flex-col gap-1 px-5 py-4">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className="text-2xl font-semibold text-[var(--text-primary)]">{value}</span>
      {sublabel && <span className="text-xs text-[var(--text-secondary)]">{sublabel}</span>}
    </div>
  );
}
