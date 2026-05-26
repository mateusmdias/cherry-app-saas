/**
 * Full-width SVG wave under invoice content (fills with `fill`, e.g. branding stripe color).
 * `preserveAspectRatio="none"` lets the wave stretch cleanly at any page width.
 */
export function InvoiceFooterWave({
  fill,
  className = 'h-14 w-full print:h-12',
}: {
  fill: string
  className?: string
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 88"
      preserveAspectRatio="none"
      className={`block ${className}`}
      aria-hidden
      focusable="false"
    >
      {/* Wavy top edge, flat bottom — decorative footer band */}
      <path
        fill={fill}
        d="M0 88V46C200 18 400 74 600 46C800 18 1000 74 1200 46V88H0z"
      />
    </svg>
  )
}
