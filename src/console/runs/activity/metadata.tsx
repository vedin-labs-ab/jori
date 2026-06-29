import {
  AlertCircle,
  Bot,
  Brain,
  Check,
  FileText,
  Hourglass,
  type LucideIcon,
  Package,
  Play,
  Plug,
  Search,
  Send,
  ShieldCheck,
  Square,
  Timer,
  Wrench,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatDuration } from "../../shared/time"
import { MetaPill } from "../row/status"
import {
  type ActivityItem,
  type ActivityKind,
  type ActivityStatus,
} from "./types"

const kindIcons = {
  agent: Bot,
  approval: ShieldCheck,
  asset: Package,
  model: Brain,
  offer: Plug,
  run: Play,
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

export function ActivityIcon({ item }: { item: ActivityItem }) {
  return (
    <ActivityTimelineIcon
      icon={itemIcon(item)}
      kind={item.kind}
      status={item.status}
    />
  )
}

export function ActivityTimelineIcon({
  icon,
  iconClassName,
  kind,
  status,
}: {
  icon?: LucideIcon
  iconClassName?: string
  kind: ActivityKind
  status: ActivityStatus
}) {
  const Icon = icon ?? kindIcons[kind]
  const label = `${kindLabels[kind]} ${statusLabel(status)}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={label}
          className="relative inline-flex size-4 shrink-0 items-center justify-center"
          role="img"
        >
          <span className="inline-flex size-4 items-center justify-center">
            <Icon
              className={cn(
                "size-3.5 text-muted-foreground transition-colors",
                iconClassName
              )}
            />
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function itemIcon(item: ActivityItem) {
  if (item.kind === "run") {
    return runIcon(item.status)
  }

  if (item.kind !== "tool") {
    return kindIcons[item.kind]
  }

  const title = item.title.toLowerCase()

  if (title.includes("send") || title.includes("reply")) {
    return Send
  }

  if (title.includes("search") || title.includes("find")) {
    return Search
  }

  if (title.includes("read")) {
    return FileText
  }

  return Wrench
}

function runIcon(status: ActivityStatus) {
  if (status === "completed") {
    return Check
  }

  if (status === "failed") {
    return AlertCircle
  }

  if (status === "stopped") {
    return Square
  }

  return Play
}

export function ActivityMeta({
  item,
  now,
}: {
  item: ActivityItem
  now: number
}) {
  return (
    <ActivityEntryMeta
      durationMs={item.durationMs}
      isLive={item.isLive === true}
      now={now}
      startedAt={item.startedAt}
    />
  )
}

export function ActivityEntryMeta({
  durationMs,
  isLive,
  now,
  startedAt,
}: {
  durationMs?: number
  isLive: boolean
  now: number
  startedAt: number
}) {
  const visibleDurationMs =
    durationMs ?? (isLive ? Math.max(0, now - startedAt) : undefined)

  return visibleDurationMs === undefined ? null : (
    <MetaPill icon={Timer} label={formatDuration(visibleDurationMs)} />
  )
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
