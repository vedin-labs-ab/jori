import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock3,
  type LucideIcon,
  Play,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDuration, statusLabel } from "./format"
import { type ExecutionStatus } from "./types"

const statusClasses = {
  completed: "bg-emerald-700/10 text-emerald-800",
  failed: "bg-red-700/10 text-red-800",
  queued: "bg-muted text-muted-foreground",
  running: "bg-emerald-700/10 text-emerald-800",
  stopped: "bg-muted text-muted-foreground",
} satisfies Record<ExecutionStatus, string>

const statusIconBorders = {
  completed: "border-emerald-700/20",
  failed: "border-red-700/20",
  queued: "border-muted",
  running: "border-emerald-700/20",
  stopped: "border-muted",
} satisfies Record<ExecutionStatus, string>

export function StatusIcon({ status }: { status: ExecutionStatus }) {
  const Icon =
    status === "completed"
      ? CheckCircle2
      : status === "failed"
        ? AlertCircle
        : status === "running"
          ? Play
          : status === "queued"
            ? Clock3
            : Circle

  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full border",
        statusClasses[status],
        statusIconBorders[status]
      )}
    >
      <Icon className="size-4" />
    </span>
  )
}

export function StatusBadge({ status }: { status: ExecutionStatus }) {
  return (
    <Badge variant="secondary" className={statusClasses[status]}>
      {statusLabel(status)}
    </Badge>
  )
}

export function ApprovalBadge({
  expiresAt,
  now,
}: {
  expiresAt: number
  now: number
}) {
  return (
    <Badge variant="secondary" className="bg-amber-700/10 text-amber-900">
      Approval - {formatDuration(Math.max(0, expiresAt - now))}
    </Badge>
  )
}

export function MetaPill({
  icon: Icon,
  label,
}: {
  icon: LucideIcon
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}
