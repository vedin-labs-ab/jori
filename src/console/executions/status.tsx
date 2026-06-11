import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ClockAlert,
  Loader2,
  type LucideIcon,
  UserCheck,
  UserPen,
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

const statusIcons = {
  completed: CheckCircle2,
  failed: AlertCircle,
  queued: Loader2,
  running: Loader2,
  stopped: Circle,
} satisfies Record<ExecutionStatus, LucideIcon>

export function StatusIcon({
  approvalState,
  status,
}: {
  approvalState?: ApprovalState
  status: ExecutionStatus
}) {
  if (approvalState === "pending") {
    return <UserPen className="size-4 text-amber-900" />
  }

  if (approvalState === "approved" || approvalState === "consumed") {
    return <UserCheck className="size-4 text-emerald-800" />
  }

  if (approvalState === "expired") {
    return <ClockAlert className="size-4 text-amber-900" />
  }

  const Icon = statusIcons[status]

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
  isVisible,
  now,
}: {
  expiresAt: number
  isVisible: boolean
  now: number
}) {
  return (
    <span className="inline-flex items-center gap-1 text-warning text-xs">
      <UserPen className="size-3.5 shrink-0" />
      <span
        aria-hidden={!isVisible}
        className={cn(
          "inline-block origin-left overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-200 ease-out",
          isVisible
            ? "max-w-56 scale-x-100 opacity-100"
            : "pointer-events-none max-w-0 scale-x-95 opacity-0"
        )}
      >
        Needs approval · {formatDuration(Math.max(0, expiresAt - now))}
      </span>
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
