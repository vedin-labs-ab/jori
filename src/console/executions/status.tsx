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
import { Badge } from "@/components/ui/badge"
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

export function StatusIcon({ status }: { status: ExecutionStatus }) {
  const label = executionStatusLabels[status]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={label}
          className="relative inline-flex size-4 shrink-0 items-center justify-center"
          role="img"
        >
          <span className="inline-flex transition-opacity duration-150 group-focus-visible/execution-row:opacity-0 group-hover/execution-row:opacity-0">
            <StatusGlyph status={status} />
          </span>
          <ChevronsUpDown className="pointer-events-none absolute size-4 text-muted-foreground opacity-0 transition-opacity duration-150 group-focus-visible/execution-row:opacity-100 group-hover/execution-row:opacity-100" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function StatusGlyph({ status }: { status: ExecutionStatus }) {
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

const approvalBadgeIcons = {
  approved: UserCheck,
  consumed: UserCheck,
  denied: UserX,
  expired: ClockAlert,
  pending: UserPen,
} satisfies Record<ApprovalState, LucideIcon>

export function ApprovalStatusBadge({
  expiresAt,
  isVisible,
  now,
  state,
}: {
  expiresAt: number
  isVisible: boolean
  now: number
  state: ApprovalState
}) {
  const Icon = approvalBadgeIcons[state]

  return (
    <Badge
      aria-hidden={!isVisible}
      className={cn(
        "origin-left overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out",
        approvalBadgeClasses[state],
        isVisible
          ? "max-w-56 scale-x-100 opacity-100"
          : "pointer-events-none max-w-0 scale-x-95 border-transparent px-0 opacity-0"
      )}
      variant="outline"
    >
      <Icon data-icon="inline-start" />
      {approvalBadgeLabel(state, expiresAt, now)}
    </Badge>
  )
}

const approvalBadgeClasses = {
  approved: "border-emerald-800/20 text-emerald-800",
  consumed: "border-emerald-800/20 text-emerald-800",
  denied: "border-destructive/20 text-destructive",
  expired: "border-warning/20 text-warning",
  pending: "border-warning/20 text-warning",
} satisfies Record<ApprovalState, string>

function approvalBadgeLabel(
  state: ApprovalState,
  expiresAt: number,
  now: number
) {
  if (state === "pending") {
    return `Needs approval · ${formatDuration(Math.max(0, expiresAt - now))}`
  }

  return approvalStatusLabels[state]
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
