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

const approvalLabels = {
  approved: "Approved",
  denied: "Denied",
  cancelled: "Cancelled",
  expired: "Approval expired",
  failed: "Approval failed",
  pending: "Needs approval",
} satisfies Record<ApprovalState, string>

const offerLabels = {
  cancelled: "Offer cancelled",
  claimed: "Needs action",
  connected: "Connected",
  expired: "Offer expired",
  failed: "Offer failed",
  pending: "Needs action",
} satisfies Record<OfferState, string>

const approvalIcons = {
  approved: UserCheck,
  denied: UserX,
  cancelled: UserX,
  expired: ClockAlert,
  failed: AlertCircle,
  pending: UserPen,
} satisfies Record<ApprovalState, LucideIcon>

const offerIcons = {
  cancelled: UserX,
  claimed: Hourglass,
  connected: CheckCircle2,
  expired: ClockAlert,
  failed: AlertCircle,
  pending: Hourglass,
} satisfies Record<OfferState, LucideIcon>

const approvalClasses = {
  approved: "text-emerald-800",
  denied: "text-destructive",
  cancelled: "text-muted-foreground",
  expired: "text-warning",
  failed: "text-destructive",
  pending: "text-muted-foreground",
} satisfies Record<ApprovalState, string>

const offerClasses = {
  cancelled: "text-muted-foreground",
  claimed: "text-muted-foreground",
  connected: "text-emerald-800",
  expired: "text-warning",
  failed: "text-destructive",
  pending: "text-muted-foreground",
} satisfies Record<OfferState, string>

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
    return actionStatus(
      approvalState,
      approvalIcons,
      approvalClasses,
      approvalLabels
    )
  }

  const offerState = effectiveOfferState(offer, now)

  return offerState === null
    ? null
    : actionStatus(offerState, offerIcons, offerClasses, offerLabels)
}

function actionStatus<State extends string>(
  state: State,
  icons: Record<State, LucideIcon>,
  classes: Record<State, string>,
  labels: Record<State, string>
) {
  return {
    Icon: icons[state],
    className: classes[state],
    label: labels[state],
  }
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
