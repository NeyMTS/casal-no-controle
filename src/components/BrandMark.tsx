export function BrandMark({
  className = "size-7",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="Casal no Controle"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="25"
        cy="34"
        r="13"
        stroke="currentColor"
        strokeWidth="2.6"
      />

      <circle
        cx="39"
        cy="34"
        r="13"
        stroke="var(--gold)"
        strokeWidth="2.6"
      />

      <g fill="currentColor">
        <rect x="33.5" y="38" width="3" height="8" rx="1" />
        <rect x="38.5" y="34" width="3" height="12" rx="1" />
        <rect x="43.5" y="30" width="3" height="16" rx="1" />
      </g>

      <g
        stroke="var(--gold)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M16 42C26 42 40 33 52 13" />
        <path d="M44 12h9v9" />
      </g>
    </svg>
  );
}
