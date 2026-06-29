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
import { ActivityTokenUsage } from "./usage"

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
          isFirst={index === 0}
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
  isFirst,
  isLast,
  now,
}: {
  entry: ActivityTimelineEntry
  isFirst: boolean
  isLast: boolean
  now: number
}) {
  if (entry.type === "tool-group") {
    return (
      <ToolGroup entry={entry} isFirst={isFirst} isLast={isLast} now={now} />
    )
  }

  return (
    <ActivityItem
      isFirst={isFirst}
      isLast={isLast}
      item={entry.item}
      now={now}
    />
  )
}

export function ActivityItem({
  isFirst = true,
  isLast = true,
  item,
  now,
}: {
  isFirst?: boolean
  isLast?: boolean
  item: ActivityItemType
  now: number
}) {
  return (
    <TimelineRow
      icon={<ActivityIcon item={item} />}
      isFirst={isFirst}
      isLast={isLast}
    >
      <Task className="min-w-0" defaultOpen={false}>
        <ActivityTaskHeader
          description={activityDescription(item)}
          meta={<ActivityMeta item={item} now={now} />}
          title={item.title}
        />
      </Task>
    </TimelineRow>
  )
}

function activityDescription(item: ActivityItemType) {
  if (item.tokenUsage !== undefined) {
    return <ActivityTokenUsage usage={item.tokenUsage} />
  }

  if (item.kind === "tool" && item.title.toLowerCase() === "send reply") {
    return undefined
  }

  return item.description
}

function ToolGroup({
  entry,
  isFirst,
  isLast,
  now,
}: {
  entry: Extract<ActivityTimelineEntry, { type: "tool-group" }>
  isFirst: boolean
  isLast: boolean
  now: number
}) {
  return (
    <TimelineRow
      icon={<ActivityTimelineIcon kind="tool" status={entry.status} />}
      isFirst={isFirst}
      isLast={isLast}
    >
      <Task className="min-w-0" defaultOpen={false}>
        <TaskTrigger className="group/activity-task" title={entry.title}>
          <button
            className="group/activity-task flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-md text-left text-muted-foreground text-sm transition-colors outline-none hover:text-foreground focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            type="button"
          >
            <ActivityTaskHeader
              className="flex-1"
              description={entry.description}
              interactive
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
            <ChevronDown className="size-4 shrink-0 text-current transition-transform group-data-[state=open]/activity-task:rotate-180" />
          </button>
        </TaskTrigger>
        <TaskContent className="data-[state=closed]:hidden data-[state=closed]:animate-none data-[state=open]:animate-none [&>div]:mt-2 [&>div]:space-y-1.5">
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
    <TaskItem className="grid h-7 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs">
      <div className="flex min-w-0 items-center gap-3">
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

function ActivityTaskHeader({
  className,
  description,
  interactive = false,
  meta,
  title,
}: {
  className?: string
  description?: ReactNode
  interactive?: boolean
  meta: ReactNode
  title: string
}) {
  return (
    <div
      className={cn(
        "grid min-h-9 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "min-w-0 truncate font-medium text-sm",
            interactive ? "text-current" : "text-foreground"
          )}
        >
          {title}
        </span>
        {description === undefined ? null : (
          <span className="inline-flex min-w-0 items-center truncate text-muted-foreground text-xs">
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
  isFirst,
  isLast,
}: {
  children: ReactNode
  icon: ReactNode
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <li className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-3">
      <div className="relative flex justify-center">
        {isFirst ? null : (
          <span className="absolute top-0 h-2 w-px bg-border" />
        )}
        {isLast ? null : (
          <span className="absolute top-9 bottom-0 w-px bg-border" />
        )}
        <span className="relative z-10 mt-2 grid size-7 place-items-center rounded-full border bg-background text-muted-foreground">
          {icon}
        </span>
      </div>
      <div className="min-w-0 py-1">{children}</div>
    </li>
  )
}
