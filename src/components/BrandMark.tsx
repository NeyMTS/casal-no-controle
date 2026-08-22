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
      <g
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="25" cy="34" r="13" />
        <circle cx="39" cy="34" r="13" />
      </g>

      <g
        stroke="var(--slateblue)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 41v-8" />
        <path d="M26 41V28" />
        <path d="M33 41V23" />

        <path d="M18 34l8-8 7 4 12-14" />

        <path d="M41 16h4v4" />
      </g>
    </svg>
  );
}
