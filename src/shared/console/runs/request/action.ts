import {
  AlertCircle,
  CheckCircle2,
  ClockAlert,
  Hourglass,
  type LucideIcon,
  UserCheck,
  UserPen,
  UserX,
} from "lucide-react"
import {
  type ApprovalState,
  type ExecutionItem,
  type OfferState,
} from "../types"

export type ApprovalIndicator = Pick<
  NonNullable<ExecutionItem["approval"]>,
  "expiresAt" | "state"
> | null

export type OfferIndicator = Pick<
  NonNullable<ExecutionItem["offer"]>,
  "expiresAt" | "state"
> | null

export type ActionStatus = {
  Icon: LucideIcon
  className: string
  label: string
}

const approvalStatuses = {
  approved: {
    Icon: UserCheck,
    className: "text-success",
    label: "Approved",
  },
  denied: { Icon: UserX, className: "text-destructive", label: "Denied" },
  cancelled: {
    Icon: UserX,
    className: "text-muted-foreground",
    label: "Cancelled",
  },
  expired: {
    Icon: ClockAlert,
    className: "text-warning",
    label: "Approval expired",
  },
  failed: {
    Icon: AlertCircle,
    className: "text-destructive",
    label: "Approval failed",
  },
  pending: {
    Icon: UserPen,
    className: "text-muted-foreground",
    label: "Needs approval",
  },
} satisfies Record<ApprovalState, ActionStatus>

const offerStatuses = {
  cancelled: {
    Icon: UserX,
    className: "text-muted-foreground",
    label: "Offer cancelled",
  },
  claimed: {
    Icon: Hourglass,
    className: "text-muted-foreground",
    label: "Needs action",
  },
  connected: {
    Icon: CheckCircle2,
    className: "text-success",
    label: "Connected",
  },
  expired: {
    Icon: ClockAlert,
    className: "text-warning",
    label: "Offer expired",
  },
  failed: {
    Icon: AlertCircle,
    className: "text-destructive",
    label: "Offer failed",
  },
  pending: {
    Icon: Hourglass,
    className: "text-muted-foreground",
    label: "Needs action",
  },
} satisfies Record<OfferState, ActionStatus>

export function getActionStatus({
  approval,
  now,
  offer,
}: {
  approval: ApprovalIndicator
  now: number
  offer: OfferIndicator
}): ActionStatus | null {
  const approvalState = effectiveApprovalState(approval, now)

  if (approvalState !== null) {
    return approvalStatuses[approvalState]
  }

  const offerState = effectiveOfferState(offer, now)

  return offerState === null ? null : offerStatuses[offerState]
}

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

function effectiveOfferState(
  offer: OfferIndicator,
  now: number
): OfferState | null {
  if (offer === null) {
    return null
  }

  if (
    (offer.state === "pending" || offer.state === "claimed") &&
    offer.expiresAt <= now
  ) {
    return "expired"
  }

  return offer.state
}
