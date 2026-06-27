import {
  Check,
  ChevronDown,
  CircleDashed,
  LoaderCircle,
  Search,
  TriangleAlert,
} from "lucide-react"
import { useEffect, useState } from "react"
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@/components/ai-elements/task"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  createDiscoveryTasks,
  type DiscoveryItemStatus,
  type DiscoveryTask,
  type DiscoveryTaskItem,
} from "./progress-data"
import { type OrganizationDiscovery } from "./types"

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
    <div className="grid gap-4">
      {tasks.map((task) => (
        <DomainTask key={task.key} now={now} task={task} />
      ))}
    </div>
  )
}

export function DiscoveryCard({
  discovery,
}: {
  discovery: OrganizationDiscovery | undefined
}) {
  if (
    discovery === undefined ||
    discovery === null ||
    discovery.status === "succeeded"
  ) {
    return null
  }

  const running = discovery.status === "running"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {running ? (
            <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <TriangleAlert className="size-4 text-destructive" />
          )}
          {running ? "Exploring your website" : "Discovery didn't finish"}
        </CardTitle>
        <CardDescription>
          {running
            ? "Reading your site and drafting your organization profile."
            : (discovery.error ?? "Something went wrong.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DiscoveryProgress discovery={discovery} />
      </CardContent>
    </Card>
  )
}

function DomainTask({ now, task }: { now: number; task: DiscoveryTask }) {
  const [open, setOpen] = useState(() => task.status !== "completed")

  useEffect(() => {
    if (isLive(task.status)) {
      setOpen(true)
    }
  }, [task.status])

  return (
    <Task open={open} onOpenChange={setOpen}>
      <TaskTrigger title={task.label}>
        <button
          className="group flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md text-muted-foreground text-sm transition-colors outline-none hover:text-foreground focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          type="button"
        >
          <TaskStatusIcon status={task.status} />
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left font-medium",
              isLive(task.status) && !open ? "shimmer" : null
            )}
          >
            {task.label}
          </span>
          <ElapsedTime>{elapsedLabel(task, now)}</ElapsedTime>
          <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </TaskTrigger>
      <TaskContent className="mt-2">
        {task.items.map((item) => (
          <ExplorationItem
            item={item}
            key={item.key}
            now={now}
            showStatus={task.status !== "completed"}
          />
        ))}
      </TaskContent>
    </Task>
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
    <TaskItem className="flex min-w-0 items-center gap-2 text-xs">
      {showStatus ? <ItemStatusIcon status={item.status} /> : null}
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          itemTone(item.status),
          item.status === "active" ? "shimmer" : null
        )}
      >
        {item.label}
      </span>
      <ElapsedTime>{elapsedLabel(item, now)}</ElapsedTime>
    </TaskItem>
  )
}

function ElapsedTime({ children }: { children: string }) {
  return (
    <span className="min-w-14 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
      {children}
    </span>
  )
}

function TaskStatusIcon({ status }: { status: DiscoveryItemStatus }) {
  if (status === "completed") {
    return <Check className="size-4 shrink-0 text-primary" />
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

function isLive(status: DiscoveryItemStatus) {
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
    return "Queued"
  }

  const endedAt = item.endedAt ?? now
  const elapsedMs = item.elapsedMs ?? endedAt - item.startedAt
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

function itemTone(status: DiscoveryItemStatus) {
  if (status === "failed") {
    return "text-destructive"
  }

  return "text-foreground"
}
