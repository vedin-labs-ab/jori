const size = 14
const stroke = 2
const radius = (size - stroke) / 2
const circumference = 2 * Math.PI * radius

/** The share of the window as an arc on a faint full circle, in the text
 *  color of whatever holds it, so the tone travels with the label. */
export function ContextRing({ fraction }: { fraction: number }) {
  return (
    <svg
      aria-hidden="true"
      className="-rotate-90 size-3.5 shrink-0"
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        className="stroke-current opacity-25"
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        strokeWidth={stroke}
      />
      <circle
        className="stroke-current"
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
        strokeLinecap="round"
        strokeWidth={stroke}
      />
    </svg>
  )
}
