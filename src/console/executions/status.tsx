import {
  AlertCircle,
  CheckCircle2,
  Circle,
  CircleAlert,
  ClockAlert,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDuration } from "./format"
import { type ApprovalState, type ExecutionStatus } from "./types"

const statusIconClasses = {
  completed: "text-emerald-800",
  failed: "text-red-800",
  queued: "text-muted-foreground",
  running: "text-muted-foreground",
  stopped: "text-muted-foreground",
} satisfies Record<ExecutionStatus, string>

export function StatusIcon({
  approvalState,
  status,
}: {
  approvalState?: ApprovalState
  status: ExecutionStatus
}) {
  if (approvalState === "pending") {
    return <CircleAlert className="size-4 text-amber-900" />
  }

  if (approvalState === "expired") {
    return <ClockAlert className="size-4 text-amber-900" />
  }

  const Icon =
    status === "completed"
      ? CheckCircle2
      : status === "failed"
        ? AlertCircle
        : status === "running"
          ? Loader2
          : status === "queued"
            ? Loader2
            : Circle

  return (
    <Icon
      className={cn(
        "size-4",
        statusIconClasses[status],
        (status === "queued" || status === "running") && "animate-spin"
      )}
    />
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
    <span className="text-warning text-xs">
      Needs approval · {formatDuration(Math.max(0, expiresAt - now))}
    </span>
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
