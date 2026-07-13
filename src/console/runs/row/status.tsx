import {
  AlertCircle,
  CheckCircle2,
  ChevronsUpDown,
  Circle,
  Hourglass,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  type ActionStatus,
  type ApprovalIndicator,
  getActionStatus,
  type OfferIndicator,
} from "../request/action"
import { type ExecutionItem, type ExecutionStatus } from "../types"

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

type WaiterIndicator = Pick<
  NonNullable<ExecutionItem["waiter"]>,
  "state"
> | null

export function StatusIcon({
  approval,
  now,
  offer,
  status,
  waiter,
}: {
  approval: ApprovalIndicator
  now: number
  offer: OfferIndicator
  status: ExecutionStatus
  waiter: WaiterIndicator
}) {
  const actionStatus = getActionStatus({ approval, now, offer })
  const isWaitingForInput = actionStatus === null && waiter?.state === "waiting"
  const label =
    actionStatus !== null
      ? `${executionStatusLabels[status]}, ${actionStatus.label}`
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
              actionStatus={actionStatus}
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
  actionStatus,
  isWaitingForInput,
  status,
}: {
  actionStatus: ActionStatus | null
  isWaitingForInput: boolean
  status: ExecutionStatus
}) {
  const Icon =
    actionStatus !== null
      ? actionStatus.Icon
      : isWaitingForInput
        ? Hourglass
        : statusIcons[status]

  return (
    <Icon
      className={cn(
        "size-4",
        actionStatus !== null
          ? actionStatus.className
          : statusIconClasses[status],
        actionStatus === null &&
          !isWaitingForInput &&
          (status === "queued" || status === "running") &&
          "animate-spin"
      )}
    />
  )
}

const executionStatusLabels = {
  completed: "Completed",
  failed: "Failed",
  queued: "Queued",
  running: "Running",
  stopped: "Stopped",
} satisfies Record<ExecutionStatus, string>

const waitingStatusLabel = "Waiting for input"

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
