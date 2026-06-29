import {
  Bot,
  Brain,
  FileArchive,
  Hourglass,
  ListChecks,
  type LucideIcon,
  PlugZap,
  ShieldCheck,
  Wrench,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { RelativeTime } from "../../shared/details"
import { SeparatorDot } from "../../shared/dot"
import { formatDuration, relativeTime } from "../../shared/time"
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

export function ActivityIcon({ item }: { item: ActivityItem }) {
  const Icon = kindIcons[item.kind]

  return (
    <span className="relative mt-0.5 grid size-4 shrink-0 place-items-center">
      <StatusDot status={item.status} />
      <Icon className="size-3.5 text-muted-foreground" />
    </span>
  )
}

export function ActivityBadges({ item }: { item: ActivityItem }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <Badge className="capitalize" variant={statusVariant(item.status)}>
        {statusLabel(item.status)}
      </Badge>
      {item.access === undefined ? null : (
        <Badge className="capitalize" variant="outline">
          {item.access}
        </Badge>
      )}
    </div>
  )
}

export function ActivityTime({
  item,
  now,
}: {
  item: ActivityItem
  now: number
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-muted-foreground text-xs">
      <RelativeTime
        absolute={item.startedAt}
        value={relativeTime(item.startedAt, now)}
      />
      {item.durationMs === undefined ? null : (
        <>
          <SeparatorDot className="text-muted-foreground/60" />
          <span>{formatDuration(item.durationMs)}</span>
        </>
      )}
    </div>
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

function statusVariant(status: ActivityStatus) {
  if (status === "failed" || status === "denied") {
    return "destructive"
  }

  if (
    status === "completed" ||
    status === "approved" ||
    status === "connected"
  ) {
    return "secondary"
  }

  return "outline"
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
