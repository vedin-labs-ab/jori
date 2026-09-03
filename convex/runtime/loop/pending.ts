import {
  type ApprovalHandoff,
  type HandoffSubject,
  type OfferHandoff,
  type RunHandoffs,
} from "../../../contracts/runtime/handoffs"

export type PendingHandoff = {
  expiresAt: number
  subject: HandoffSubject
}

export function hasResolvedHandoffs(handoffs: RunHandoffs) {
  return (
    handoffs.approvals.some((approval) => !isPendingApproval(approval)) ||
    handoffs.offers.some((offer) => !isPendingOffer(offer))
  )
}

export function isPendingApproval(approval: ApprovalHandoff) {
  return approval.status === "pending"
}

export function isPendingOffer(offer: OfferHandoff) {
  return offer.status === "pending" || offer.status === "claimed"
}
