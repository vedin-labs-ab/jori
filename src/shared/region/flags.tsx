import { cn } from "@/lib/utils"

const stripeHeight = 16 / 13

/** A five-pointed star, one unit from centre to tip, pointing up. */
const starPath = `M${Array.from({ length: 10 }, (_, index) => {
  const angle = ((index * 36 - 90) * Math.PI) / 180
  const reach = index % 2 === 0 ? 1 : 0.382

  return `${round(reach * Math.cos(angle))} ${round(reach * Math.sin(angle))}`
}).join("L")}Z`

/** The twelve stars of the European flag around a centre. Coordinates are
 *  rounded because Node and the browser disagree on the last bit of a sine,
 *  and the difference showed up as a hydration mismatch on every flag. */
export function StarRing({
  cx,
  cy,
  radius,
  size,
}: {
  cx: number
  cy: number
  radius: number
  size: number
}) {
  return Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * 2 * Math.PI
    const x = round(cx + radius * Math.sin(angle))
    const y = round(cy - radius * Math.cos(angle))

    return (
      <path
        d={starPath}
        fill="#FFCC00"
        key={`${x}-${y}`}
        transform={`translate(${x} ${y}) scale(${size})`}
      />
    )
  })
}

function round(value: number) {
  return Math.round(value * 1000) / 1000
}

/** Rows of five and four, offset like the real canton's rows of six and
 *  five, at a count that still reads as a field of stars this small. */
const cantonDots = [0, 1, 2, 3, 4].flatMap((row) =>
  Array.from({ length: row % 2 === 0 ? 5 : 4 }, (_, column) => ({
    cx: round((row % 2 === 0 ? 1 : 1.95) + column * 1.9),
    cy: round(0.95 + row * 1.68),
  }))
)

/** The two regions' flags, drawn rather than typed: emoji flags depend on
 *  the reader's fonts and fall back to plain letters on some systems, and
 *  these need to look the same on every screen. */
export function RegionFlag({
  className,
  region,
}: {
  className?: string
  region: "eu" | "us"
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-foreground/10 ring-inset",
        className
      )}
      viewBox="0 0 24 16"
    >
      {region === "eu" ? (
        <>
          <rect fill="#003399" height="16" width="24" />
          <StarRing cx={12} cy={8} radius={5.333} size={0.9} />
        </>
      ) : (
        <>
          <rect fill="#FFFFFF" height="16" width="24" />
          {[0, 2, 4, 6, 8, 10, 12].map((stripe) => (
            <rect
              fill="#B22234"
              height={stripeHeight}
              key={stripe}
              width="24"
              y={stripe * stripeHeight}
            />
          ))}
          <rect fill="#3C3B6E" height={7 * stripeHeight} width="9.6" />
          {cantonDots.map((dot) => (
            <circle
              cx={dot.cx}
              cy={dot.cy}
              fill="#FFFFFF"
              key={`${dot.cx}-${dot.cy}`}
              r="0.42"
            />
          ))}
        </>
      )}
    </svg>
  )
}
