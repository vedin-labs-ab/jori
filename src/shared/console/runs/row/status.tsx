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
  const glyph = resolveStatusGlyph({ approval, now, offer, status, waiter })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={glyph.label}
          className="relative inline-flex size-4 shrink-0 items-center justify-center"
          role="img"
        >
          <span className="inline-flex transition-opacity duration-150 group-focus-visible/run-row:opacity-0 group-hover/run-row:opacity-0">
            <StatusGlyph glyph={glyph} />
          </span>
          <ChevronsUpDown className="pointer-events-none absolute size-4 text-muted-foreground opacity-0 transition-opacity duration-150 group-focus-visible/run-row:opacity-100 group-hover/run-row:opacity-100" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{glyph.label}</TooltipContent>
    </Tooltip>
  )
}

type StatusGlyphState = {
  className: string
  Icon: LucideIcon
  isSpinning: boolean
  label: string
}

/**
 * What the indicator shows, decided once. A pending action speaks for the
 * run, then a waiter, then the run's own execution status; only that last
 * case spins.
 */
function resolveStatusGlyph({
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
}): StatusGlyphState {
  const execution = executionStatuses[status]
  const actionStatus = getActionStatus({ approval, now, offer })

  if (actionStatus !== null) {
    return {
      className: actionStatus.className,
      Icon: actionStatus.Icon,
      isSpinning: false,
      label: `${execution.label}, ${actionStatus.label}`,
    }
  }

  if (waiter?.state === "waiting") {
    return {
      className: execution.className,
      Icon: Hourglass,
      isSpinning: false,
      label: "Waiting for input",
    }
  }

  return {
    className: execution.className,
    Icon: execution.Icon,
    isSpinning: status === "queued" || status === "running",
    label: execution.label,
  }
}

function StatusGlyph({ glyph }: { glyph: StatusGlyphState }) {
  return (
    <glyph.Icon
      className={cn(
        "size-4",
        glyph.className,
        glyph.isSpinning && "animate-spin"
      )}
    />
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
      <span className="min-w-[9ch] tabular-nums">{label}</span>
    </span>
  )
}
