import {
  Bot,
  ChevronsUpDown,
  Cpu,
  Hourglass,
  ListChecks,
  type LucideIcon,
  Package,
  Plug,
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
  asset: Package,
  model: Cpu,
  offer: Plug,
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
              "inline-flex size-4 items-center justify-center",
              isExpandable &&
                "transition-opacity duration-150 group-focus-visible/run-row:opacity-0 group-hover/run-row:opacity-0"
            )}
          >
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
      <ActivityLiveIndicator isLive={item.isLive === true} />
    </>
  )
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
