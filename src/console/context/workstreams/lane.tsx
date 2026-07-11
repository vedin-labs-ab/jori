import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { type PulseCell, type PulseLane } from "./series"

// Contribution-graph intensity steps. Placed activity ramps the brand
// primary; not-yet-placed activity ramps the informational blue so waiting
// work reads as pending review, not as a warning.
const placedRamp = [
  "bg-primary/35",
  "bg-primary/60",
  "bg-primary/80",
  "bg-primary",
]
const unplacedRamp = [
  "bg-informational/35",
  "bg-informational/60",
  "bg-informational/80",
  "bg-informational",
]
const tooltipEffortLimit = 5

export function LaneRow({
  lane,
  laneGrid,
  unplaced,
  onOpen,
}: {
  lane: PulseLane
  laneGrid: string
  unplaced: number
  onOpen: (() => void) | undefined
}) {
  const label =
    onOpen === undefined ? (
      <UnplacedLabel count={unplaced} name={lane.name} />
    ) : (
      <button
        type="button"
        onClick={onOpen}
        className="truncate pr-4 text-left text-muted-foreground text-sm transition-colors hover:text-foreground"
      >
        {lane.name}
      </button>
    )

  return (
    <div className={laneGrid}>
      {label}
      {lane.cells.map((cell) => (
        <DayCell key={cell.day.key} cell={cell} unplaced={lane.id === null} />
      ))}
    </div>
  )
}

// The count lives on the lane label itself: the number of efforts waiting
// for a workstream sits exactly where their activity renders, and the dot
// keys the lane to its color.
function UnplacedLabel({ count, name }: { count: number; name: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex min-w-0 items-center gap-1.5 pr-4">
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-informational"
          />
          <span className="truncate text-informational text-sm">{name}</span>
          {count > 0 ? (
            <span className="rounded-sm bg-informational/15 px-1 font-medium text-[11px] text-informational tabular-nums">
              {count}
            </span>
          ) : null}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-60">
        {count === 1 ? "1 effort" : `${count} efforts`} not yet in a workstream.
        The weekly review places them or proposes new workstreams.
      </TooltipContent>
    </Tooltip>
  )
}

function DayCell({ cell, unplaced }: { cell: PulseCell; unplaced: boolean }) {
  return (
    <div className="flex h-7 items-center justify-center">
      {cell.count === 0 ? (
        <span aria-hidden className="size-4 rounded-[4px] bg-border/50" />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              aria-label={`${cell.count} entries on ${cell.day.title}`}
              className={cn(
                "size-4 rounded-[4px]",
                cellClass(cell.count, unplaced)
              )}
              role="img"
            />
          </TooltipTrigger>
          <TooltipContent className="max-w-60">
            <CellDetail cell={cell} />
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function cellClass(count: number, unplaced: boolean) {
  const step = count >= 6 ? 3 : count >= 4 ? 2 : count >= 2 ? 1 : 0

  return (unplaced ? unplacedRamp : placedRamp)[step]
}

function CellDetail({ cell }: { cell: PulseCell }) {
  const hidden = cell.efforts.length - tooltipEffortLimit

  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">
        {cell.day.title} ·{" "}
        {cell.count === 1 ? "1 entry" : `${cell.count} entries`}
      </span>
      {cell.efforts.slice(0, tooltipEffortLimit).map((name) => (
        <span key={name}>{name}</span>
      ))}
      {hidden > 0 ? <span>…and {hidden} more</span> : null}
    </div>
  )
}
