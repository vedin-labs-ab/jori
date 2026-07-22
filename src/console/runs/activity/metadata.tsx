import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  BookmarkX,
  BookOpen,
  Brain,
  Check,
  FileText,
  GitBranch,
  Hourglass,
  Link2,
  type LucideIcon,
  Package,
  Play,
  Plug,
  Search,
  Send,
  ShieldCheck,
  SmilePlus,
  Square,
  Terminal,
  Timer,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDuration } from "../../shared/time"
import { MetaPill } from "../row/status"
import {
  type ActivityItem,
  type ActivityKind,
  type ActivityStatus,
} from "./types"

const kindMetadata = {
  agent: { Icon: GitBranch, label: "Agent" },
  approval: { Icon: ShieldCheck, label: "Approval" },
  asset: { Icon: Package, label: "Asset" },
  model: { Icon: Brain, label: "Model" },
  offer: { Icon: Plug, label: "Connection" },
  run: { Icon: Play, label: "Run" },
  tool: { Icon: Wrench, label: "Tool" },
  wait: { Icon: Hourglass, label: "Wait" },
} satisfies Record<ActivityKind, { Icon: LucideIcon; label: string }>

const statusLabels = {
  approved: "approved",
  cancelled: "cancelled",
  completed: "done",
  connected: "connected",
  denied: "denied",
  expired: "expired",
  failed: "failed",
  pending: "pending",
  requested: "requested",
  running: "running",
  stopped: "stopped",
  waiting: "waiting",
} satisfies Record<ActivityStatus, string>

const toolIcons: Record<string, LucideIcon> = {
  bash: Terminal,
  load_skill: BookOpen,
  share_artifact: Link2,
}

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
  const metadata = kindMetadata[kind]
  const Icon = icon ?? metadata.Icon
  const label = `${metadata.label} ${statusLabels[status]}`

  return (
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
  )
}

function itemIcon(item: ActivityItem) {
  if (item.kind === "run") {
    return runIcon(item.status)
  }

  if (item.kind !== "tool") {
    return kindMetadata[item.kind].Icon
  }

  if (item.tool === "wait_for_agents") {
    return agentWaitIcon(item)
  }

  const specificIcon =
    item.tool === undefined ? undefined : toolIcons[item.tool]

  if (specificIcon !== undefined) {
    return specificIcon
  }

  const title = item.title.toLowerCase()

  if (title.includes("send") || title.includes("reply")) {
    return Send
  }

  if (title.includes("reaction")) {
    return SmilePlus
  }

  if (title.includes("search") || title.includes("find")) {
    return Search
  }

  if (title.includes("read")) {
    return FileText
  }

  return Wrench
}

function agentWaitIcon(item: ActivityItem) {
  const outcomes = (item.metadata ?? [])
    .filter((entry) => entry.kind === "outcome")
    .map((entry) => entry.text)

  if (
    item.status === "failed" ||
    item.status === "stopped" ||
    outcomes.some(isUnsuccessfulAgentOutcome)
  ) {
    return BookmarkX
  }

  if (outcomes.some((outcome) => outcome.endsWith(" ongoing"))) {
    return Bookmark
  }

  return outcomes.length > 0 || item.status === "completed"
    ? BookmarkCheck
    : Bookmark
}

function isUnsuccessfulAgentOutcome(outcome: string) {
  return outcome.endsWith(" failed") || outcome.endsWith(" stopped")
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
