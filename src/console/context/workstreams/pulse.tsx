import { useQuery } from "convex/react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { api } from "../../../../convex/_generated/api"
import { buildPulse, type PulseCell, type PulseLane } from "./series"
import { type Workstream, type Workstreams } from "./types"

// Column count mirrors pulseDayCount; Tailwind needs the literals. Fixed
// column pitch keeps the cells contribution-graph dense instead of
// stretching with the viewport.
const laneGrid = "grid grid-cols-[8.5rem_repeat(14,18px)] items-center"

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

// A compact two-week strip of extraction movement: one lane per workstream,
// a lane for efforts not yet placed, and the review heartbeat. It makes the
// hourly rhythm and the weekly restructure visible instead of leaving quiet
// periods looking broken.
export function WorkstreamsPulse({
  tenantId,
  workstreams,
  onOpen,
}: {
  tenantId: string
  workstreams: Workstreams
  onOpen: (workstream: Workstream) => void
}) {
  const pulse = useQuery(api.deduction.console.pulse.read, { tenantId })

  if (pulse === undefined || pulse === null) {
    return null
  }

  const { days, lanes } = buildPulse(pulse.entries, workstreams, pulse.now)

  if (lanes.length === 0) {
    return null
  }

  return (
    <Card className="w-full max-w-2xl gap-2 px-4 py-3">
      <PulseHeader
        now={pulse.now}
        reviewedAt={pulse.reviewedAt}
        consolidationAt={pulse.consolidationAt}
        unplaced={pulse.unplaced}
      />
      <div className="flex flex-col gap-px">
        {lanes.map((lane) => (
          <LaneRow
            key={lane.id ?? "unplaced"}
            lane={lane}
            onOpen={laneOpener(lane, workstreams, onOpen)}
          />
        ))}
        <div className={laneGrid}>
          <span />
          {days.map((day) => (
            <span
              key={day.key}
              className={cn(
                "pt-0.5 text-center text-[11px] text-muted-foreground tabular-nums",
                day.isToday && "font-medium text-foreground"
              )}
            >
              {day.label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}

function laneOpener(
  lane: PulseLane,
  workstreams: Workstreams,
  onOpen: (workstream: Workstream) => void
) {
  const workstream = workstreams.find((row) => row.id === lane.id)

  return workstream === undefined ? undefined : () => onOpen(workstream)
}

function PulseHeader({
  now,
  reviewedAt,
  consolidationAt,
  unplaced,
}: {
  now: number
  reviewedAt: number | null
  consolidationAt: number | null
  unplaced: number
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <div className="flex items-baseline gap-2">
        <span className="font-medium text-sm">Activity</span>
        <span className="text-muted-foreground text-xs">Last 14 days</span>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        <span>{reviewedLabel(reviewedAt, now)}</span>
        <span>{consolidationLabel(consolidationAt, now)}</span>
        {unplaced > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="border-informational/50 text-informational"
              >
                {unplaced} unplaced
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Efforts not yet in a workstream. The weekly review places them or
              proposes new workstreams.
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}

function LaneRow({
  lane,
  onOpen,
}: {
  lane: PulseLane
  onOpen: (() => void) | undefined
}) {
  const label =
    onOpen === undefined ? (
      <span className="truncate pr-3 font-medium text-informational text-xs">
        {lane.name}
      </span>
    ) : (
      <button
        type="button"
        onClick={onOpen}
        className="truncate pr-3 text-left text-muted-foreground text-xs transition-colors hover:text-foreground"
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

function DayCell({ cell, unplaced }: { cell: PulseCell; unplaced: boolean }) {
  return (
    <div className="flex h-[18px] items-center justify-center">
      {cell.count === 0 ? (
        <span aria-hidden className="size-3 rounded-[3px] bg-border/50" />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              aria-label={`${cell.count} entries on ${cell.day.title}`}
              className={cn(
                "size-3 rounded-[3px]",
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

function reviewedLabel(reviewedAt: number | null, now: number) {
  if (reviewedAt === null) {
    return "Not reviewed yet"
  }

  const date = new Date(reviewedAt)
  const sameDay = date.toDateString() === new Date(now).toDateString()

  return `Reviewed ${
    sameDay
      ? date.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })
      : date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }`
}

const hourMs = 60 * 60 * 1000

function consolidationLabel(consolidationAt: number | null, now: number) {
  if (consolidationAt === null) {
    return "Weekly review pending"
  }

  const delta = consolidationAt - now

  if (delta <= 0) {
    return "Weekly review due"
  }

  return delta < 48 * hourMs
    ? `Weekly review in ${Math.max(1, Math.round(delta / hourMs))}h`
    : `Weekly review in ${Math.round(delta / (24 * hourMs))}d`
}
