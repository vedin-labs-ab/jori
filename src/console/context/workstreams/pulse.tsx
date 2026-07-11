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

// Column count mirrors pulseDayCount; Tailwind needs the literal.
const laneGrid =
  "grid grid-cols-[minmax(7rem,11rem)_repeat(14,minmax(0,1fr))] items-center"
const tooltipEffortLimit = 5

// A compact two-week strip of extraction movement: one dot lane per
// workstream, an amber lane for efforts not yet placed, and the review
// heartbeat. It makes the hourly rhythm and the weekly restructure visible
// instead of leaving quiet periods looking broken.
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
    <Card className="gap-2.5 px-4 py-3">
      <PulseHeader
        now={pulse.now}
        reviewedAt={pulse.reviewedAt}
        consolidationAt={pulse.consolidationAt}
        unplaced={pulse.unplaced}
      />
      <div className="flex flex-col">
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
                "pt-0.5 text-center text-[11px] text-muted-foreground",
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
                className="border-warning/50 text-warning"
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
      <span className="truncate pr-2 font-medium text-warning text-xs">
        {lane.name}
      </span>
    ) : (
      <button
        type="button"
        onClick={onOpen}
        className="truncate pr-2 text-left text-muted-foreground text-xs transition-colors hover:text-foreground"
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
    <div
      className={cn(
        "flex h-6 items-center justify-center",
        cell.day.isToday && "bg-muted/50"
      )}
    >
      {cell.count === 0 ? (
        <span aria-hidden className="size-[3px] rounded-full bg-border" />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              aria-label={`${cell.count} entries on ${cell.day.title}`}
              className={dotClass(cell.count, unplaced)}
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

function dotClass(count: number, unplaced: boolean) {
  const size = count >= 4 ? "size-2.5" : count >= 2 ? "size-2" : "size-1.5"
  const strength =
    count >= 4 ? "opacity-90" : count >= 2 ? "opacity-70" : "opacity-50"

  return cn(
    "rounded-full",
    size,
    strength,
    unplaced ? "border-2 border-warning bg-transparent" : "bg-foreground"
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
