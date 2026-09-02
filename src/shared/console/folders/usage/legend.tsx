import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type UsageSegment, usageSegmentColor } from "./types"

// The one vocabulary the charts and the folder table share: a segment's
// colour. The swatch is the same mark in both, so a reader who learns a
// colour in the legend finds it again in the table without looking twice.

export function SegmentSwatch({
  className,
  color,
}: {
  className?: string
  color: string
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-[3px]", className)}
      style={{ backgroundColor: color }}
    />
  )
}

/** Every segment once, in rank order, under both charts at once. Each is
 *  a switch: pressing one lifts that segment out of both charts, so the
 *  rest can be read against each other, and pressing again puts it back.
 *  The choice lives only as long as the page does. */
export function SegmentLegend({
  hidden,
  onToggle,
  segments,
}: {
  hidden: ReadonlySet<string>
  onToggle: (key: string) => void
  segments: UsageSegment[]
}) {
  return (
    <ul className="-mx-2 flex flex-wrap gap-y-1">
      {segments.map((segment, rank) => {
        const shown = !hidden.has(segment.key)

        return (
          <li key={segment.key}>
            <Button
              aria-pressed={shown}
              className={cn(
                "font-normal text-muted-foreground",
                !shown && "text-muted-foreground/60"
              )}
              onClick={() => onToggle(segment.key)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <SegmentSwatch
                className={shown ? undefined : "opacity-30"}
                color={usageSegmentColor(segment, rank)}
              />
              {segment.label}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
