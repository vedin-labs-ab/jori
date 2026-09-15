import { useId } from "react"
import { cn } from "@/lib/utils"

const stripeHeight = 16 / 13

/** A five-pointed star, one unit from center to tip, pointing up. */
const starPath = `M${Array.from({ length: 10 }, (_, index) => {
  const angle = ((index * 36 - 90) * Math.PI) / 180
  const reach = index % 2 === 0 ? 1 : 0.382

  return `${round(reach * Math.cos(angle))} ${round(reach * Math.sin(angle))}`
}).join("L")}Z`

/** The twelve stars of the European flag around a center. Coordinates are
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

/** Corners and rim are drawn in the flag's own units, so they scale with
 *  it: a hair of rounding inline in a sentence, a little more at badge
 *  size, never the box radius that suits neither. The rim is a touch of
 *  ink inside the edge, which gives the white stripe a boundary on a light
 *  ground and disappears on a dark one. */
const flagCorner = 2.2

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
  const clip = useId()

  return (
    <svg
      aria-hidden="true"
      className={cn("h-3.5 w-5 shrink-0", className)}
      viewBox="0 0 24 16"
    >
      <clipPath id={clip}>
        <rect height="16" rx={flagCorner} width="24" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
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
        {/* Two pixels wide, centered on the edge: the clip keeps the inner
            pixel and drops the rest. */}
        <rect
          fill="none"
          height="16"
          rx={flagCorner}
          stroke="#000000"
          strokeOpacity="0.12"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          width="24"
        />
      </g>
    </svg>
  )
}
