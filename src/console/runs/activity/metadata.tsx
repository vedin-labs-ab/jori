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
  Timer,
  Wrench,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  kind,
  status,
}: {
  icon?: LucideIcon
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
            <Icon className="size-3.5 text-muted-foreground" />
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

  return (
    <>
      {visibleDurationMs === undefined ? null : (
        <MetaPill icon={Timer} label={formatDuration(visibleDurationMs)} />
      )}
      <ActivityLiveIndicator isLive={isLive} />
    </>
  )
}

export function ActivityToolMetadata({
  items,
}: {
  items: NonNullable<ActivityItem["metadata"]>
}) {
  return (
    <span className="inline-flex min-w-0 items-center overflow-hidden">
      {items.map((item, index) => (
        <span
          className="inline-flex min-w-0 items-center"
          key={metadataKey(item)}
        >
          {index === 0 ? null : (
            <span className="mx-1.5 shrink-0 text-muted-foreground/70">·</span>
          )}
          <span className="min-w-0 truncate">{item.text}</span>
        </span>
      ))}
    </span>
  )
}

function metadataKey(item: NonNullable<ActivityItem["metadata"]>[number]) {
  return `${item.kind}:${item.text}`
}

function ActivityLiveIndicator({ isLive }: { isLive: boolean }) {
  if (!isLive) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label="Running now"
          className="relative inline-flex size-2 shrink-0"
          role="status"
        >
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
      </TooltipTrigger>
      <TooltipContent>Running now</TooltipContent>
    </Tooltip>
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
