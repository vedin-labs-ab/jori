import { type UsageSegment, usageSegmentColor } from "./types"

// The one vocabulary the charts and the folder table share: a segment's
// colour. The swatch is the same mark in both, so a reader who learns a
// colour in the legend finds it again in the table without looking twice.

export function SegmentSwatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2.5 shrink-0 rounded-[3px]"
      style={{ backgroundColor: color }}
    />
  )
}

/** Every segment once, in rank order, under both charts at once. */
export function SegmentLegend({ segments }: { segments: UsageSegment[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-muted-foreground text-xs">
      {segments.map((segment, rank) => (
        <li className="flex items-center gap-1.5" key={segment.key}>
          <SegmentSwatch color={usageSegmentColor(segment, rank)} />
          {segment.label}
        </li>
      ))}
    </ul>
  )
}
