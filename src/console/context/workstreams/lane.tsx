import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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

// The label column stays pinned while the day grid scrolls beneath it, so
// wide windows never cost lane identity. The opaque card background hides
// the squares passing under, and the card's horizontal inset lives on the
// pinned cells so nothing shows in the padding strip.
export const stickyLane =
  "sticky left-0 z-10 self-stretch bg-card pl-(--card-spacing)"
const stickyLabel = cn(stickyLane, "flex min-w-0 items-center pr-4 text-sm")

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
        className={cn(
          stickyLabel,
          "text-left text-muted-foreground transition-colors hover:text-foreground"
        )}
      >
        <span className="truncate">{lane.name}</span>
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
// for a workstream sits exactly where their activity renders. The dot and
// count carry the lane's color key; the name reads like every other label.
function UnplacedLabel({ count, name }: { count: number; name: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(stickyLabel, "gap-1.5")}>
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-informational"
          />
          <span className="truncate text-muted-foreground">{name}</span>
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

// Mirrors the default two-week card's box - same shell classes, 476px
// content, three lane rows, axis, and banded footer - so the card resolves
// in place instead of shifting the page when data arrives.
export function PulseSkeleton() {
  return (
    <div className="@container">
      <Card className="w-fit max-w-[min(56rem,100cqw)] pb-0">
        <CardHeader>
          <CardTitle className="self-center">
            <Skeleton className="h-4 w-14" />
          </CardTitle>
          <CardDescription className="col-span-2">
            <Skeleton className="h-[18px] w-80 max-w-full" />
          </CardDescription>
          <CardAction className="row-span-1">
            <Skeleton className="h-6 w-28" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex w-[29.75rem] max-w-full flex-col gap-1">
            {[0, 1, 2].map((lane) => (
              <div
                key={lane}
                className="grid h-7 grid-cols-[10.5rem_1fr] items-center"
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
            <div className="grid h-[21px] grid-cols-[10.5rem_1fr] items-end">
              <span />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-6 border-t bg-muted/25 pt-3! pb-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-40" />
        </CardFooter>
      </Card>
    </div>
  )
}
