import {
  AlertCircle,
  CheckCircle2,
  ChevronsUpDown,
  Circle,
  ClockAlert,
  Loader2,
  type LucideIcon,
  UserCheck,
  UserPen,
  UserX,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  const label = statusLabel(approvalState, status)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={label}
          className="relative inline-flex size-4 shrink-0 items-center justify-center"
          role="img"
        >
          <span className="inline-flex transition-opacity duration-150 group-focus-visible/execution-row:opacity-0 group-hover/execution-row:opacity-0">
            <StatusGlyph approvalState={approvalState} status={status} />
          </span>
          <ChevronsUpDown className="pointer-events-none absolute size-4 text-muted-foreground opacity-0 transition-opacity duration-150 group-focus-visible/execution-row:opacity-100 group-hover/execution-row:opacity-100" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function StatusGlyph({
  approvalState,
  status,
}: {
  approvalState?: ApprovalState
  status: ExecutionStatus
}) {
  if (approvalState === "pending") {
    return <UserPen className="size-4 text-warning" />
  }

  if (approvalState === "approved" || approvalState === "consumed") {
    return <UserCheck className="size-4 text-emerald-800" />
  }

  if (approvalState === "denied") {
    return <UserX className="size-4 text-destructive" />
  }

  if (approvalState === "expired") {
    return <ClockAlert className="size-4 text-warning" />
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

function statusLabel(
  approvalState: ApprovalState | undefined,
  status: ExecutionStatus
) {
  if (approvalState !== undefined) {
    return approvalStatusLabels[approvalState]
  }

  return executionStatusLabels[status]
}

const approvalStatusLabels = {
  approved: "Approved",
  consumed: "Approved",
  denied: "Denied",
  expired: "Approval expired",
  pending: "Needs approval",
} satisfies Record<ApprovalState, string>

const executionStatusLabels = {
  completed: "Completed",
  failed: "Failed",
  queued: "Queued",
  running: "Running",
  stopped: "Stopped",
} satisfies Record<ExecutionStatus, string>

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
    <span
      aria-hidden={!isVisible}
      className={cn(
        "inline-block origin-left overflow-hidden whitespace-nowrap text-warning text-xs transition-[max-width,opacity,transform] duration-200 ease-out",
        isVisible
          ? "max-w-56 scale-x-100 opacity-100"
          : "pointer-events-none max-w-0 scale-x-95 opacity-0"
      )}
    >
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
