import { ChevronDown } from "lucide-react"
import { type ReactNode } from "react"
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@/components/ai-elements/task"
import { cn } from "@/lib/utils"
import { formatDuration } from "../../shared/time"
import {
  ActivityEntryMeta,
  ActivityIcon,
  ActivityMeta,
  ActivityTimelineIcon,
} from "./metadata"
import { type ActivityTimelineEntry, createActivityTimeline } from "./timeline"
import { type ActivityItem as ActivityItemType } from "./types"

export function ActivityTimeline({
  items,
  now,
}: {
  items: ActivityItemType[]
  now: number
}) {
  const entries = createActivityTimeline(items)

  return (
    <ol className="grid min-w-0">
      {entries.map((entry, index) => (
        <ActivityTimelineRow
          entry={entry}
          isLast={index === entries.length - 1}
          key={entry.id}
          now={now}
        />
      ))}
    </ol>
  )
}

function ActivityTimelineRow({
  entry,
  isLast,
  now,
}: {
  entry: ActivityTimelineEntry
  isLast: boolean
  now: number
}) {
  if (entry.type === "tool-group") {
    return <ToolGroup entry={entry} isLast={isLast} now={now} />
  }

  return <ActivityItem isLast={isLast} item={entry.item} now={now} />
}

export function ActivityItem({
  isLast = true,
  item,
  now,
}: {
  isLast?: boolean
  item: ActivityItemType
  now: number
}) {
  return (
    <TimelineRow icon={<ActivityIcon item={item} />} isLast={isLast}>
      <ActivityLine
        description={item.description}
        meta={<ActivityMeta item={item} now={now} />}
        title={item.title}
      />
    </TimelineRow>
  )
}

function ToolGroup({
  entry,
  isLast,
  now,
}: {
  entry: Extract<ActivityTimelineEntry, { type: "tool-group" }>
  isLast: boolean
  now: number
}) {
  return (
    <TimelineRow
      icon={<ActivityTimelineIcon kind="tool" status={entry.status} />}
      isLast={isLast}
    >
      <Task defaultOpen={false}>
        <TaskTrigger className="group/activity-task" title={entry.title}>
          <button
            className="group/activity-task flex min-h-8 w-full min-w-0 items-center gap-3 text-left outline-none focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            type="button"
          >
            <ActivityLine
              className="flex-1"
              description={entry.description}
              meta={
                <ActivityEntryMeta
                  durationMs={entry.durationMs}
                  isLive={entry.isLive}
                  now={now}
                  startedAt={entry.startedAt}
                />
              }
              title={entry.title}
            />
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/activity-task:rotate-180" />
          </button>
        </TaskTrigger>
        <TaskContent className="mt-1 data-[state=closed]:hidden data-[state=closed]:animate-none data-[state=open]:animate-none">
          {entry.items.map((item) => (
            <ToolGroupItem item={item} key={item.id} />
          ))}
        </TaskContent>
      </Task>
    </TimelineRow>
  )
}

function ToolGroupItem({ item }: { item: ActivityItemType }) {
  return (
    <TaskItem className="grid min-h-6 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="min-w-0 truncate font-medium text-foreground">
          {item.title}
        </span>
        {item.description === undefined ? null : (
          <span className="min-w-0 truncate text-muted-foreground">
            {item.description}
          </span>
        )}
      </div>
      <span className="shrink-0 text-muted-foreground tabular-nums">
        {item.durationMs === undefined ? null : formatDuration(item.durationMs)}
      </span>
    </TaskItem>
  )
}

function ActivityLine({
  className,
  description,
  meta,
  title,
}: {
  className?: string
  description?: string
  meta: ReactNode
  title: string
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3",
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="min-w-0 truncate font-medium text-foreground text-sm">
          {title}
        </span>
        {description === undefined ? null : (
          <span className="min-w-0 truncate text-muted-foreground text-xs">
            {description}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">{meta}</div>
    </div>
  )
}

function TimelineRow({
  children,
  icon,
  isLast,
}: {
  children: ReactNode
  icon: ReactNode
  isLast: boolean
}) {
  return (
    <li className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-3">
      <div className="relative flex justify-center">
        {isLast ? null : (
          <span className="absolute top-7 bottom-0 w-px bg-border" />
        )}
        <span className="relative z-10 mt-1 grid size-7 place-items-center rounded-full border bg-background text-muted-foreground">
          {icon}
        </span>
      </div>
      <div
        className={cn("min-w-0 border-b py-2.5", isLast ? "border-b-0" : null)}
      >
        {children}
      </div>
    </li>
  )
}
