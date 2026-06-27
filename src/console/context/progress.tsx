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
    <div className="grid gap-2">
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
  return (
    <Task defaultOpen={task.status !== "completed"}>
      <TaskTrigger title={task.label}>
        <button
          className="group flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          type="button"
        >
          <Search className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left font-medium">
            {task.label}
          </span>
          <span className="shrink-0 text-xs">{elapsedLabel(task, now)}</span>
          <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </TaskTrigger>
      <TaskContent className="mt-2">
        {task.items.map((item) => (
          <ExplorationItem item={item} key={item.key} now={now} />
        ))}
      </TaskContent>
    </Task>
  )
}

function ExplorationItem({
  item,
  now,
}: {
  item: DiscoveryTaskItem
  now: number
}) {
  return (
    <TaskItem className="flex min-w-0 items-start gap-2 text-xs">
      <StatusIcon status={item.status} />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className={cn("truncate", itemTone(item.status))}>
          {item.label}
        </span>
        <span className="truncate text-muted-foreground">{item.url}</span>
      </span>
      <span className="shrink-0 text-muted-foreground">
        {elapsedLabel(item, now)}
      </span>
    </TaskItem>
  )
}

function StatusIcon({ status }: { status: DiscoveryItemStatus }) {
  const className = cn("mt-0.5 size-3.5 shrink-0", iconTone(status))

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
  item: Pick<DiscoveryTask, "endedAt" | "startedAt" | "status">,
  now: number
) {
  if (item.status === "queued") {
    return "Queued"
  }

  const endedAt = item.endedAt ?? now
  const seconds = Math.max(0, Math.round((endedAt - item.startedAt) / 1000))

  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`
}

function iconTone(status: DiscoveryItemStatus) {
  if (status === "completed") {
    return "text-foreground"
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
