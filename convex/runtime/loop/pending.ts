import {
  type ApprovalHandoff,
  type OfferHandoff,
  type RunHandoffs,
} from "../../runs/execution/waiters/handoffs"
import { type WaiterSubject } from "../../runs/execution/waiters/schema"

export type PendingHandoff = {
  expiresAt: number
  subject: Extract<WaiterSubject, { kind: "approval" | "offer" }>
}

export function hasResolvedHandoffs(handoffs: RunHandoffs) {
  return (
    handoffs.approvals.some((approval) => !isPendingApproval(approval)) ||
    handoffs.offers.some((offer) => !isPendingOffer(offer))
  )
}

export function isPendingApproval(approval: ApprovalHandoff) {
  return (
    approval.status === "pending" ||
    (approval.status === "approved" &&
      approval.executionPendingUntil !== undefined &&
      Date.now() < approval.executionPendingUntil)
  )
}

export function isPendingOffer(offer: OfferHandoff) {
  return offer.status === "pending" || offer.status === "claimed"
}
