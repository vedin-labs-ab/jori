import {
  ChevronDown,
  FileText,
  type LucideIcon,
  Search,
  Send,
} from "lucide-react"
import { type ReactNode } from "react"
import {
  Task,
  TaskContent,
  TaskItem,
  TaskLabel,
  TaskTrigger,
} from "@/components/ai-elements/task"
import { cn } from "@/lib/utils"
import { formatDuration } from "../../shared/time"
import { ActivityFailureDescription } from "./error"
import {
  ActivityEntryMeta,
  ActivityIcon,
  ActivityMeta,
  ActivityTimelineIcon,
} from "./metadata"
import { type ActivityTimelineEntry, createActivityTimeline } from "./timeline"
import { ActivityToolMetadata } from "./tool-metadata"
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
          isLive={item.isLive === true}
          meta={<ActivityMeta item={item} now={now} />}
          title={item.title}
        />
      </Task>
    </TimelineRow>
  )
}

function activityDescription(item: ActivityItemType) {
  const error = activityError(item)

  if (error !== undefined) {
    return <ActivityFailureDescription error={error} title={item.title} />
  }

  if (item.tokenUsage !== undefined) {
    return <ActivityTokenUsage usage={item.tokenUsage} />
  }

  if (item.metadata !== undefined && item.metadata.length > 0) {
    return <ActivityToolMetadata items={item.metadata} title={item.title} />
  }

  if (item.kind === "tool" && item.title.toLowerCase() === "send reply") {
    return undefined
  }

  return item.description
}

function activityError(item: ActivityItemType) {
  if (item.kind !== "tool" || item.status !== "failed") {
    return undefined
  }

  return (
    item.details?.find((detail) => detail.label === "Error")?.value ??
    item.description
  )
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
      icon={
        <ActivityTimelineIcon
          iconClassName="group-hover/activity-task-row:text-foreground"
          icon={toolGroupIcon(entry.toolKind)}
          kind="tool"
          status={entry.status}
        />
      }
      interactive
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
              isLive={entry.isLive}
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
  const description = activityDescription(item)

  return (
    <TaskItem className="grid h-7 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs">
      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
        <TaskLabel
          className="max-w-[14rem] shrink-0 truncate font-medium text-foreground"
          shimmer={item.isLive === true}
        >
          {item.title}
        </TaskLabel>
        {description === undefined ? null : (
          <span className="inline-flex min-w-0 flex-1 basis-0 items-center overflow-hidden text-muted-foreground">
            {description}
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
  isLive = false,
  meta,
  title,
}: {
  className?: string
  description?: ReactNode
  isLive?: boolean
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
      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
        <TaskLabel
          className="max-w-[50%] shrink-0 truncate font-medium text-foreground text-sm"
          shimmer={isLive}
        >
          {title}
        </TaskLabel>
        {description === undefined ? null : (
          <span className="inline-flex min-w-0 flex-1 basis-0 items-center overflow-hidden text-muted-foreground text-xs">
            {description}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">{meta}</div>
    </div>
  )
}

function toolGroupIcon(
  toolKind: Extract<ActivityTimelineEntry, { type: "tool-group" }>["toolKind"]
): LucideIcon | undefined {
  switch (toolKind) {
    case "generic":
      return undefined
    case "read":
    case "web-fetch":
      return FileText
    case "send":
      return Send
    case "web-search":
      return Search
  }
}

function TimelineRow({
  children,
  icon,
  interactive = false,
  isFirst,
  isLast,
}: {
  children: ReactNode
  icon: ReactNode
  interactive?: boolean
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <li
      className={cn(
        "grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-3",
        interactive ? "group/activity-task-row" : null
      )}
    >
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
