import {
  Check,
  CircleDashed,
  FileText,
  LoaderCircle,
  Search,
  TriangleAlert,
} from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
import { TaskItem } from "@/components/ai-elements/task"
import { cn } from "@/lib/utils"
import { createDiscoveryTasks } from "./progress-data"
import {
  type DiscoveryItemStatus,
  type DiscoveryTask,
  type DiscoveryTaskItem,
  type DiscoveryTaskStatus,
  type OrganizationDiscovery,
} from "./types"

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
  const live = isLive(task.status)
  const showTaskElapsed = !live || task.items.length > 1

  return (
    <div className="grid gap-2">
      <div className="flex h-7 min-w-0 items-center gap-2 rounded-md text-muted-foreground text-sm">
        <IconSlot>
          <TaskStatusIcon status={task.status} type={task.type} />
        </IconSlot>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left font-medium",
            live ? "shimmer" : null
          )}
        >
          {task.label}
        </span>
        <ElapsedTime>
          {showTaskElapsed ? elapsedLabel(task, now) : null}
        </ElapsedTime>
      </div>
      {live ? (
        <div className="grid gap-1 border-muted border-l pl-4">
          {task.items.map((item) => (
            <ExplorationItem item={item} key={item.key} now={now} showStatus />
          ))}
        </div>
      ) : null}
    </div>
  )
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

  const seconds = Math.max(0, Math.round(elapsedMs / 1000))

  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`
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
