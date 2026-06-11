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

const approvalStatusIcons = {
  approved: UserCheck,
  consumed: UserCheck,
  denied: UserX,
  expired: ClockAlert,
  pending: UserPen,
} satisfies Record<ApprovalState, LucideIcon>

export function ApprovalStatusMeta({
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
  const Icon = approvalStatusIcons[state]

  return (
    <span
      aria-hidden={!isVisible}
      className={cn(
        "inline-flex origin-left items-center gap-1 overflow-hidden whitespace-nowrap text-xs transition-[max-width,opacity,transform] duration-200 ease-out",
        approvalStatusClasses[state],
        isVisible
          ? "max-w-56 scale-x-100 opacity-100"
          : "pointer-events-none max-w-0 scale-x-95 opacity-0"
      )}
    >
      <Icon className="size-3.5" />
      {approvalStatusLabel(state, expiresAt, now)}
    </span>
  )
}

const approvalStatusClasses = {
  approved: "text-emerald-800",
  consumed: "text-emerald-800",
  denied: "text-destructive",
  expired: "text-warning",
  pending: "text-warning",
} satisfies Record<ApprovalState, string>

function approvalStatusLabel(
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
