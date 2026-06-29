import {
  Bot,
  Brain,
  ChevronsUpDown,
  FileArchive,
  Hourglass,
  ListChecks,
  type LucideIcon,
  PlugZap,
  ShieldCheck,
  Timer,
  Wrench,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { RelativeTime } from "../../shared/details"
import { formatDuration, relativeTime } from "../../shared/time"
import { MetaPill } from "../row/status"
import {
  type ActivityItem,
  type ActivityKind,
  type ActivityStatus,
} from "./types"

const kindIcons = {
  agent: Bot,
  approval: ShieldCheck,
  asset: FileArchive,
  model: Brain,
  offer: PlugZap,
  run: ListChecks,
  tool: Wrench,
  wait: Hourglass,
} satisfies Record<ActivityKind, LucideIcon>

const kindLabels = {
  agent: "Agent",
  approval: "Approval",
  asset: "Asset",
  model: "Model",
  offer: "Connection",
  run: "Run",
  tool: "Tool",
  wait: "Wait",
} satisfies Record<ActivityKind, string>

export function ActivityIcon({
  isExpandable,
  item,
}: {
  isExpandable: boolean
  item: ActivityItem
}) {
  const Icon = kindIcons[item.kind]
  const label = `${kindLabels[item.kind]} ${statusLabel(item.status)}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={label}
          className="relative mt-0.5 inline-flex size-4 shrink-0 items-center justify-center"
          role="img"
        >
          <span
            className={cn(
              "relative inline-flex size-4 items-center justify-center",
              isExpandable &&
                "transition-opacity duration-150 group-focus-visible/run-row:opacity-0 group-hover/run-row:opacity-0"
            )}
          >
            <StatusDot status={item.status} />
            <Icon className="size-3.5 text-muted-foreground" />
          </span>
          {isExpandable ? (
            <ChevronsUpDown className="pointer-events-none absolute size-4 text-muted-foreground opacity-0 transition-opacity duration-150 group-focus-visible/run-row:opacity-100 group-hover/run-row:opacity-100" />
          ) : null}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function ActivityMeta({
  item,
  now,
}: {
  item: ActivityItem
  now: number
}) {
  return (
    <>
      {item.durationMs === undefined ? null : (
        <MetaPill icon={Timer} label={formatDuration(item.durationMs)} />
      )}
      <RelativeTime
        absolute={item.startedAt}
        value={relativeTime(item.startedAt, now)}
      />
    </>
  )
}

function StatusDot({ status }: { status: ActivityStatus }) {
  const active = status === "running" || status === "waiting"

  return (
    <span className="-right-0.5 -top-0.5 absolute grid size-2.5 place-items-center rounded-full bg-background">
      {active ? (
        <span className="absolute size-1.5 animate-ping rounded-full bg-primary opacity-70" />
      ) : null}
      <span
        className={cn("relative block size-1.5 rounded-full", dotClass(status))}
      />
    </span>
  )
}

function dotClass(status: ActivityStatus) {
  if (status === "failed" || status === "denied") {
    return "bg-destructive"
  }

  if (
    status === "completed" ||
    status === "approved" ||
    status === "connected"
  ) {
    return "bg-emerald-600"
  }

  if (status === "cancelled" || status === "expired" || status === "stopped") {
    return "bg-muted-foreground"
  }

  return "bg-primary"
}

function statusLabel(status: ActivityStatus) {
  switch (status) {
    case "approved":
      return "approved"
    case "cancelled":
      return "cancelled"
    case "completed":
      return "done"
    case "connected":
      return "connected"
    case "denied":
      return "denied"
    case "expired":
      return "expired"
    case "failed":
      return "failed"
    case "pending":
      return "pending"
    case "requested":
      return "requested"
    case "running":
      return "running"
    case "stopped":
      return "stopped"
    case "waiting":
      return "waiting"
  }
}
