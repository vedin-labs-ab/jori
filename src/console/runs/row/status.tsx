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

const executionStatuses = {
  completed: {
    Icon: CheckCircle2,
    className: "text-success",
    label: "Completed",
  },
  failed: {
    Icon: AlertCircle,
    className: "text-destructive",
    label: "Failed",
  },
  queued: {
    Icon: Loader2,
    className: "text-muted-foreground",
    label: "Queued",
  },
  running: {
    Icon: Loader2,
    className: "text-muted-foreground",
    label: "Running",
  },
  stopped: {
    Icon: Circle,
    className: "text-muted-foreground",
    label: "Stopped",
  },
} satisfies Record<ExecutionStatus, ActionStatus>

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
      ? `${executionStatuses[status].label}, ${actionStatus.label}`
      : isWaitingForInput
        ? waitingStatusLabel
        : executionStatuses[status].label

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
  const statusMetadata = executionStatuses[status]
  const Icon =
    actionStatus !== null
      ? actionStatus.Icon
      : isWaitingForInput
        ? Hourglass
        : statusMetadata.Icon

  return (
    <Icon
      className={cn(
        "size-4",
        actionStatus !== null
          ? actionStatus.className
          : statusMetadata.className,
        actionStatus === null &&
          !isWaitingForInput &&
          (status === "queued" || status === "running") &&
          "animate-spin"
      )}
    />
  )
}

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
