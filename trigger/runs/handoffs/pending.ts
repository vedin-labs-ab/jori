import {
  type HandoffSubject,
  type RunHandoffs,
} from "../../../contracts/runtime/worker"

export type PendingHandoff = {
  expiresAt: number
  subject: HandoffSubject
}

export function hasResolvedHandoffs(handoffs: RunHandoffs) {
  return (
    handoffs.approvals.some((approval) => approval.status !== "pending") ||
    handoffs.offers.some(
      (offer) => offer.status !== "pending" && offer.status !== "claimed"
    )
  )
}

export function pendingHandoffSubjects(pending: PendingHandoff[]) {
  return pending.map((handoff) => handoff.subject)
}
