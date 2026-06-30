import {
  AlertCircle,
  CheckCircle2,
  ChevronsUpDown,
  Circle,
  ClockAlert,
  Hourglass,
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
import { SeparatorDot } from "../../shared/dot"
import { formatDuration } from "../../shared/time"
import {
  type ApprovalState,
  type ExecutionItem,
  type ExecutionStatus,
} from "../types"

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

type ApprovalIndicator = Pick<
  NonNullable<ExecutionItem["approval"]>,
  "expiresAt" | "state"
> | null

type WaiterIndicator = Pick<
  NonNullable<ExecutionItem["waiter"]>,
  "state"
> | null

export function StatusIcon({
  approval,
  now,
  status,
  waiter,
}: {
  approval: ApprovalIndicator
  now: number
  status: ExecutionStatus
  waiter: WaiterIndicator
}) {
  const approvalState = effectiveApprovalState(approval, now)
  const isWaitingForInput =
    approvalState === null && waiter?.state === "waiting"
  const label =
    approvalState !== null
      ? `${executionStatusLabels[status]}, ${approvalStatusLabels[approvalState]}`
      : isWaitingForInput
        ? waitingStatusLabel
        : executionStatusLabels[status]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={label}
          className="relative inline-flex size-4 shrink-0 items-center justify-center"
          role="img"
        >
          <span className="inline-flex transition-opacity duration-150 group-focus-visible/run-row:opacity-0 group-hover/run-row:opacity-0">
            <StatusGlyph
              approvalState={approvalState}
              isWaitingForInput={isWaitingForInput}
              status={status}
            />
          </span>
          <ChevronsUpDown className="pointer-events-none absolute size-4 text-muted-foreground opacity-0 transition-opacity duration-150 group-focus-visible/run-row:opacity-100 group-hover/run-row:opacity-100" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function StatusGlyph({
  approvalState,
  isWaitingForInput,
  status,
}: {
  approvalState: ApprovalState | null
  isWaitingForInput: boolean
  status: ExecutionStatus
}) {
  const Icon =
    approvalState !== null
      ? approvalStatusIcons[approvalState]
      : isWaitingForInput
        ? Hourglass
        : statusIcons[status]

  return (
    <Icon
      className={cn(
        "size-4",
        approvalState !== null
          ? approvalStatusClasses[approvalState]
          : statusIconClasses[status],
        approvalState === null &&
          !isWaitingForInput &&
          (status === "queued" || status === "running") &&
          "animate-spin"
      )}
    />
  )
}

const approvalStatusLabels = {
  approved: "Approved",
  denied: "Denied",
  cancelled: "Cancelled",
  expired: "Approval expired",
  failed: "Approval failed",
  pending: "Needs approval",
} satisfies Record<ApprovalState, string>

const executionStatusLabels = {
  completed: "Completed",
  failed: "Failed",
  queued: "Queued",
  running: "Running",
  stopped: "Stopped",
} satisfies Record<ExecutionStatus, string>

const waitingStatusLabel = "Waiting for input"

const approvalStatusIcons = {
  approved: UserCheck,
  denied: UserX,
  cancelled: UserX,
  expired: ClockAlert,
  failed: AlertCircle,
  pending: UserPen,
} satisfies Record<ApprovalState, LucideIcon>

export function ApprovalStatusMeta({
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
        "inline-flex origin-left items-center gap-1 overflow-hidden whitespace-nowrap text-xs transition-[max-width,opacity,transform] duration-200 ease-out",
        approvalStatusClasses.pending,
        isVisible
          ? "max-w-56 scale-x-100 opacity-100"
          : "pointer-events-none max-w-0 scale-x-95 opacity-0"
      )}
    >
      <span>Needs approval</span>
      <SeparatorDot />
      <span>{formatDuration(Math.max(0, expiresAt - now))}</span>
    </span>
  )
}

const approvalStatusClasses = {
  approved: "text-emerald-800",
  denied: "text-destructive",
  cancelled: "text-muted-foreground",
  expired: "text-warning",
  failed: "text-destructive",
  pending: "text-warning",
} satisfies Record<ApprovalState, string>

function effectiveApprovalState(
  approval: ApprovalIndicator,
  now: number
): ApprovalState | null {
  if (approval === null) {
    return null
  }

  if (approval.state === "pending" && approval.expiresAt <= now) {
    return "expired"
  }

  return approval.state
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
