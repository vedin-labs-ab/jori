import {
  Check,
  ChevronDown,
  CircleDashed,
  FileText,
  LoaderCircle,
  Search,
  TriangleAlert,
} from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "../../../../shared/task"
import { formatDuration } from "../../../../shared/time"
import {
  type DiscoveryItemStatus,
  type DiscoveryTask,
  type DiscoveryTaskItem,
  type DiscoveryTaskStatus,
  type OrganizationDiscovery,
} from "../../types"
import { createDiscoveryTasks } from "./tasks"

export function DiscoveryProgress({
  discovery,
}: {
  discovery: OrganizationDiscovery | undefined
}) {
  const now = useProgressTime(discovery)

  if (discovery === undefined || discovery === null) {
    return null
  }

  const tasks = createDiscoveryTasks(discovery, now)

  if (tasks.length === 0) {
    return null
  }

  return (
    <div className="grid gap-4 overflow-visible">
      {tasks.map((task) => (
        <DiscoveryTaskRow key={task.key} now={now} task={task} />
      ))}
    </div>
  )
}

function DiscoveryTaskRow({ now, task }: { now: number; task: DiscoveryTask }) {
  if (task.type === "summary") {
    return <SummaryTask now={now} task={task} />
  }

  return <DomainTask now={now} task={task} />
}

function SummaryTask({ now, task }: { now: number; task: DiscoveryTask }) {
  return (
    <div className="flex h-7 min-w-0 items-center gap-2 rounded-md text-muted-foreground text-sm">
      <IconSlot>
        <TaskStatusIcon status={task.status} type={task.type} />
      </IconSlot>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-left font-medium",
          isLive(task.status) ? "shimmer" : null
        )}
      >
        {task.label}
      </span>
      <ElapsedTime>{elapsedLabel(task, now)}</ElapsedTime>
    </div>
  )
}

function DomainTask({ now, task }: { now: number; task: DiscoveryTask }) {
  const [preference, setPreference] = useState<OpenPreference | null>(null)
  const preferredOpen =
    preference?.key === task.key && preference.status === task.status
      ? preference.open
      : null
  const open = preferredOpen ?? isLive(task.status)
  const showTaskElapsed = !open || task.items.length > 1

  return (
    <Task
      onOpenChange={(nextOpen) =>
        setPreference({ key: task.key, open: nextOpen, status: task.status })
      }
      open={open}
    >
      <TaskTrigger title={task.label}>
        <button
          className="group flex h-7 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md text-muted-foreground text-sm transition-colors outline-none hover:text-foreground focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          type="button"
        >
          <IconSlot>
            <TaskStatusIcon status={task.status} type={task.type} />
          </IconSlot>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left font-medium",
              isLive(task.status) && !open ? "shimmer" : null
            )}
          >
            {task.label}
          </span>
          <ElapsedTime>
            {showTaskElapsed ? elapsedLabel(task, now) : null}
          </ElapsedTime>
          <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </TaskTrigger>
      <TaskContent className="mt-2 data-[state=closed]:hidden data-[state=closed]:animate-none data-[state=open]:animate-none">
        {task.items.map((item) => (
          <ExplorationItem item={item} key={item.key} now={now} showStatus />
        ))}
      </TaskContent>
    </Task>
  )
}

type OpenPreference = {
  key: string
  open: boolean
  status: DiscoveryTaskStatus
}

function ExplorationItem({
  item,
  now,
  showStatus,
}: {
  item: DiscoveryTaskItem
  now: number
  showStatus: boolean
}) {
  return (
    <TaskItem className="flex h-6 min-w-0 items-center gap-2 text-xs">
      {showStatus ? <ItemStatusIcon status={item.status} /> : null}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-foreground",
          item.status === "active" ? "shimmer" : null
        )}
      >
        {item.label}
      </span>
      <ElapsedTime>{elapsedLabel(item, now)}</ElapsedTime>
    </TaskItem>
  )
}

function ElapsedTime({ children }: { children: string | null }) {
  return (
    <span
      className={cn(
        "w-16 shrink-0 text-right text-muted-foreground text-xs tabular-nums",
        children === null && "invisible"
      )}
    >
      {children ?? "0s"}
    </span>
  )
}

function IconSlot({
  children,
  size = "md",
}: {
  children: ReactNode
  size?: "md" | "sm"
}) {
  return (
    <span
      aria-hidden={children === null ? "true" : undefined}
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "md" ? "size-4" : "size-3.5"
      )}
    >
      {children}
    </span>
  )
}

function TaskStatusIcon({
  status,
  type,
}: {
  status: DiscoveryTaskStatus
  type: DiscoveryTask["type"]
}) {
  if (status === "failed") {
    return <TriangleAlert className="size-4 shrink-0 text-destructive" />
  }

  if (status === "warning") {
    return <TriangleAlert className="size-4 shrink-0 text-warning" />
  }

  if (status === "completed") {
    return <Check className="size-4 shrink-0 text-primary" />
  }

  if (type === "summary" && status === "active") {
    return <LoaderCircle className="size-4 shrink-0 animate-spin" />
  }

  if (type === "summary") {
    return <FileText className="size-4 shrink-0" />
  }

  return <Search className="size-4 shrink-0" />
}

function ItemStatusIcon({ status }: { status: DiscoveryItemStatus }) {
  const className = cn("size-3.5 shrink-0", iconTone(status))

  if (status === "active") {
    return <LoaderCircle className={cn(className, "animate-spin")} />
  }

  if (status === "completed") {
    return <Check className={className} />
  }

  if (status === "failed") {
    return <TriangleAlert className={className} />
  }

  return <CircleDashed className={className} />
}

function isLive(status: DiscoveryTaskStatus) {
  return status === "active" || status === "queued"
}

function useProgressTime(discovery: OrganizationDiscovery | undefined) {
  const [now, setNow] = useState(() => Date.now())
  const running = discovery?.status === "running"

  useEffect(() => {
    if (!running) {
      return
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(interval)
  }, [running])

  return now
}

function elapsedLabel(
  item: Pick<DiscoveryTask, "endedAt" | "startedAt" | "status"> &
    Partial<Pick<DiscoveryTask, "elapsedMs">>,
  now: number
) {
  if (item.status === "queued") {
    return null
  }

  const endedAt = item.endedAt ?? now
  const elapsedMs = item.elapsedMs ?? endedAt - item.startedAt

  if (!Number.isFinite(elapsedMs)) {
    return null
  }

  return formatDuration(elapsedMs)
}

function iconTone(status: DiscoveryItemStatus) {
  if (status === "completed") {
    return "text-primary"
  }

  if (status === "failed") {
    return "text-destructive"
  }

  return "text-muted-foreground"
}
