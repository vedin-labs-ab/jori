import { Clock, MessageSquare, Pencil, Repeat2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SeparatorDot } from "../dot"
import { DeleteSchedule } from "./delete"
import { absoluteTime, relativeTime } from "./format"
import { type Schedule } from "./types"

export function ScheduleRow({
  isDeleting,
  now,
  onDelete,
  onEdit,
  schedule,
}: {
  isDeleting: boolean
  now: number
  onDelete: (schedule: Schedule) => void
  onEdit: (schedule: Schedule) => void
  schedule: Schedule
}) {
  const TypeIcon = schedule.type === "recurring" ? Repeat2 : Clock
  const typeLabel =
    schedule.type === "recurring" ? "Recurring schedule" : "One-time schedule"

  return (
    <article className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-md border bg-background p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
      <TypeIcon
        aria-label={typeLabel}
        className="mt-0.5 size-4 shrink-0 text-muted-foreground md:mt-0"
        role="img"
      />
      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-sm">{schedule.name}</span>
          {schedule.status === "completed" ? (
            <Badge variant="outline">Completed</Badge>
          ) : null}
        </div>
        <p className="truncate text-muted-foreground text-xs">
          {schedule.description}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
          <ScheduleTiming schedule={schedule} />
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MessageSquare className="size-3.5" />
            <span>Slack</span>
            <SeparatorDot />
            <span className="truncate">
              {schedule.output.channelId}
              {schedule.output.threadId === undefined ? "" : " (thread)"}
            </span>
          </span>
        </div>
      </div>
      <div className="col-span-2 flex items-center gap-3 justify-self-start md:col-span-1 md:justify-self-end">
        <ScheduleRuns now={now} schedule={schedule} />
        <div className="flex items-center">
          <Button
            aria-label={`Edit ${schedule.name}`}
            onClick={() => onEdit(schedule)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Pencil />
          </Button>
          <DeleteSchedule
            isDeleting={isDeleting}
            onDelete={() => onDelete(schedule)}
            schedule={schedule}
          />
        </div>
      </div>
    </article>
  )
}

function ScheduleTiming({ schedule }: { schedule: Schedule }) {
  if (schedule.type === "recurring") {
    return <span className="font-mono">{schedule.cron} UTC</span>
  }

  return (
    <span>
      Once at{" "}
      {schedule.runAt === undefined ? "unknown" : absoluteTime(schedule.runAt)}
    </span>
  )
}

function ScheduleRuns({ now, schedule }: { now: number; schedule: Schedule }) {
  return (
    <div className="grid gap-0.5 text-left text-xs md:text-right">
      {schedule.nextRunAt === undefined ? (
        <span className="text-muted-foreground">No upcoming runs</span>
      ) : (
        <span title={absoluteTime(schedule.nextRunAt)}>
          Next {relativeTime(schedule.nextRunAt, now)}
        </span>
      )}
      {schedule.lastTriggeredAt === undefined ? (
        <span className="text-muted-foreground">Never run</span>
      ) : (
        <span
          className="text-muted-foreground"
          title={absoluteTime(schedule.lastTriggeredAt)}
        >
          Ran {relativeTime(schedule.lastTriggeredAt, now)}
        </span>
      )}
    </div>
  )
}
