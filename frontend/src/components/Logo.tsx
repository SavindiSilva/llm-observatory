export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg"
      style={{ width: size, height: size, background: "var(--series-groq)" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" width={size * 0.64} height={size * 0.64}>
        <path
          d="M2 12h5l2-7 4 14 3-9 1.5 2H22"
          stroke="white"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="12" r="2" fill="var(--series-gemini)" />
      </svg>
    </span>
  );
}
