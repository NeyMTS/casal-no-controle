export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Casal no Controle"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    >
      <circle cx="13" cy="16" r="6.5" />
      <circle cx="19" cy="16" r="6.5" />
      <path d="M16 12.4v7.2" className="text-income" stroke="var(--income)" />
    </svg>
  );
}
