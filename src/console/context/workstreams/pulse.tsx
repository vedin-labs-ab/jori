import { useQuery } from "convex/react"
import { CalendarDays, Clock } from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { api } from "../../../../convex/_generated/api"
import { LaneRow, stickyLane } from "./lane"
import { buildPulse, type PulseLane } from "./series"
import { type Workstream, type Workstreams } from "./types"

type PulseDays = 14 | 30 | 60
type PulseData = NonNullable<
  ReturnType<typeof useQuery<typeof api.deduction.console.pulse.read>>
>

const rangeOptions: { value: PulseDays; label: string }[] = [
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
]

// One literal per range; Tailwind cannot compose repeat() counts at runtime.
// Fixed column pitch keeps the cells contribution-graph dense instead of
// stretching with the viewport.
const laneGrids: Record<PulseDays, string> = {
  14: "grid grid-cols-[11.5rem_repeat(14,22px)] items-center",
  30: "grid grid-cols-[11.5rem_repeat(30,22px)] items-center",
  60: "grid grid-cols-[11.5rem_repeat(60,22px)] items-center",
}

// A compact heatmap of extraction movement: one lane per workstream, a lane
// for efforts not yet placed, and the review heartbeat. It makes the hourly
// rhythm and the weekly restructure visible instead of leaving quiet periods
// looking broken.
export function WorkstreamsPulse({
  tenantId,
  workstreams,
  onOpen,
}: {
  tenantId: string
  workstreams: Workstreams
  onOpen: (workstream: Workstream) => void
}) {
  const [days, setDays] = useState<PulseDays>(14)
  const result = useQuery(api.deduction.console.pulse.read, { tenantId, days })
  const [pulse, setPulse] = useState<PulseData | null>(null)
  const loadedDays = pulse?.days ?? null
  const { scrollRef, trackPinned } = usePinnedToEnd(loadedDays)

  // Hold the last loaded window while a new range streams in, so switching
  // ranges never blanks the card.
  useEffect(() => {
    if (result !== undefined && result !== null) {
      setPulse(result)
    }
  }, [result])

  if (pulse === null) {
    return null
  }

  const view = buildPulse(pulse.entries, workstreams, pulse.now, pulse.days)

  if (view.lanes.length === 0) {
    return null
  }

  return (
    <Card className="w-fit max-w-[min(56rem,100%)] pb-0">
      <CardHeader>
        <CardTitle className="self-center">Activity</CardTitle>
        <CardDescription className="col-span-2">
          Recent activity across workstreams and unplaced efforts.
        </CardDescription>
        <CardAction className="row-span-1">
          <Select
            value={String(days)}
            onValueChange={(value) => setDays(Number(value) as PulseDays)}
          >
            <SelectTrigger size="sm" className="w-fit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent
        className="overflow-x-auto px-0"
        onScroll={trackPinned}
        ref={scrollRef}
      >
        <div className="flex w-fit flex-col gap-1 pr-(--card-spacing)">
          {view.lanes.map((lane) => (
            <LaneRow
              key={lane.id ?? "unplaced"}
              lane={lane}
              laneGrid={laneGrids[pulse.days]}
              unplaced={lane.id === null ? pulse.unplaced : 0}
              onOpen={laneOpener(lane, workstreams, onOpen)}
            />
          ))}
          <div className={laneGrids[pulse.days]}>
            <span className={stickyLane} />
            {view.days.map((day) => (
              <span
                key={day.key}
                className={cn(
                  "whitespace-nowrap pt-1 text-center text-[11px] text-muted-foreground tabular-nums",
                  day.emphasized && "font-medium text-foreground"
                )}
              >
                {day.label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-6 border-t bg-muted/25 pt-3! pb-3 text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5">
          <Clock aria-hidden className="size-3.5 shrink-0" />
          <ReviewedNote reviewedAt={pulse.reviewedAt} now={pulse.now} />
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays aria-hidden className="size-3.5 shrink-0" />
          <ConsolidationNote
            consolidationAt={pulse.consolidationAt}
            now={pulse.now}
          />
        </span>
      </CardFooter>
    </Card>
  )
}

// Today lives at the right edge, so the view stays pinned to the end: on
// each loaded window, and again whenever the container or grid resizes
// (small viewports, window resizing) - unless the reader has deliberately
// scrolled back into history.
function usePinnedToEnd(loadedDays: PulseDays | null) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)

  useEffect(() => {
    const node = scrollRef.current

    if (loadedDays === null || node === null) {
      return
    }

    pinned.current = true
    node.scrollLeft = node.scrollWidth

    const observer = new ResizeObserver(() => {
      if (pinned.current) {
        node.scrollLeft = node.scrollWidth
      }
    })

    observer.observe(node)

    if (node.firstElementChild !== null) {
      observer.observe(node.firstElementChild)
    }

    return () => observer.disconnect()
  }, [loadedDays])

  const trackPinned = () => {
    const node = scrollRef.current

    if (node !== null) {
      pinned.current =
        node.scrollLeft >= node.scrollWidth - node.clientWidth - 2
    }
  }

  return { scrollRef, trackPinned }
}

function laneOpener(
  lane: PulseLane,
  workstreams: Workstreams,
  onOpen: (workstream: Workstream) => void
) {
  const workstream = workstreams.find((row) => row.id === lane.id)

  return workstream === undefined ? undefined : () => onOpen(workstream)
}

function Strong({ children }: { children: ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>
}

function ReviewedNote({
  reviewedAt,
  now,
}: {
  reviewedAt: number | null
  now: number
}) {
  if (reviewedAt === null) {
    return <span>Not reviewed yet</span>
  }

  const date = new Date(reviewedAt)

  if (date.toDateString() === new Date(now).toDateString()) {
    return (
      <span>
        Reviewed <Strong>today</Strong>,{" "}
        {date.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>
    )
  }

  return (
    <span>
      Reviewed{" "}
      <Strong>
        {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </Strong>
    </span>
  )
}

const hourMs = 60 * 60 * 1000

function ConsolidationNote({
  consolidationAt,
  now,
}: {
  consolidationAt: number | null
  now: number
}) {
  if (consolidationAt === null) {
    return <span>Weekly review pending</span>
  }

  const delta = consolidationAt - now

  if (delta <= 0) {
    return (
      <span>
        Weekly review <Strong>due</Strong>
      </span>
    )
  }

  const label =
    delta < 48 * hourMs
      ? `${Math.max(1, Math.round(delta / hourMs))}h`
      : `${Math.round(delta / (24 * hourMs))}d`

  return (
    <span>
      Weekly review in <Strong>{label}</Strong>
    </span>
  )
}
