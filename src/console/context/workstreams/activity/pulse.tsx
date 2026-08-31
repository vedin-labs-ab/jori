import { useQuery } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { CalendarDays, Clock } from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "../../../../../convex/_generated/api"
import { shortDate } from "../../../shared/time"
import { ContextTitleCount } from "../../section"
import { type Workstream, type Workstreams } from "../types"
import { PulseFooter, PulseShell, PulseSkeleton } from "./lane"
import { buildPulse, type PulseDays } from "./series"
import { PulseViewport } from "./viewport"

type PulseData = NonNullable<
  FunctionReturnType<typeof api.workstreams.pulse.read>
>

const rangeOptions: { value: PulseDays; label: string }[] = [
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
]

// A compact heatmap of extraction movement: one lane per workstream, a lane
// for efforts not yet placed, and the review heartbeat. It makes the hourly
// rhythm and the weekly restructure visible instead of leaving quiet periods
// looking broken.
export function WorkstreamsPulse({
  organizationId,
  workstreams,
  onOpen,
}: {
  organizationId: string
  workstreams: Workstreams
  onOpen: (workstream: Workstream) => void
}) {
  const [days, setDays] = useState<PulseDays>(14)
  const result = useQuery(api.workstreams.pulse.read, { organizationId, days })
  const [pulse, setPulse] = useState<PulseData | null>(null)

  // Hold the last loaded window while a new range streams in, so switching
  // ranges never blanks the card.
  useEffect(() => {
    if (result !== undefined && result !== null) {
      setPulse(result)
    }
  }, [result])

  if (pulse === null) {
    return <PulseSkeleton />
  }

  const view = buildPulse(pulse.entries, workstreams, pulse.now, pulse.days)
  const activeCount = view.lanes.filter((lane) => lane.id !== null).length

  if (view.lanes.length === 0) {
    return null
  }

  // The @container wrapper severs intrinsic sizing: without it the grid's
  // fixed tracks propagate their full width through every min-width:auto
  // flex ancestor (a percentage max-width cannot resolve during intrinsic
  // sizing), silently widening the whole page. Container-query units can
  // resolve, so the card caps against real available width instead.
  return (
    <PulseShell
      title={
        <span className="flex items-baseline gap-1.5">
          <span>Activity</span>
          <ContextTitleCount count={activeCount} />
        </span>
      }
      description="Recent activity across workstreams and unplaced efforts."
      action={
        <Select
          value={String(days)}
          onValueChange={(value) => setDays(Number(value) as PulseDays)}
        >
          <SelectTrigger
            aria-label="Activity range"
            className="w-fit"
            size="sm"
          >
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
      }
    >
      <PulseViewport
        key={pulse.days}
        dayCount={pulse.days}
        days={view.days}
        lanes={view.lanes}
        onOpen={onOpen}
        unplaced={pulse.unplaced}
        workstreams={workstreams}
      />
      <PulseFooter>
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
      </PulseFooter>
    </PulseShell>
  )
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
      Reviewed <Strong>{shortDate(reviewedAt)}</Strong>
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
