import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"

const approvalSubject = v.object({
  kind: v.literal("approval"),
  id: v.id("approvals"),
})
const integrationOfferSubject = v.object({
  kind: v.literal("integrationOffer"),
  id: v.id("integrationOffers"),
})
export const transitionSubject = v.union(
  approvalSubject,
  integrationOfferSubject
)
const transitionType = v.union(
  v.literal("created"),
  v.literal("delivered"),
  v.literal("approved"),
  v.literal("denied"),
  v.literal("cancelled"),
  v.literal("connected"),
  v.literal("expired"),
  v.literal("failed")
)
const approvalTransitionType = v.union(
  v.literal("created"),
  v.literal("delivered"),
  v.literal("approved"),
  v.literal("denied"),
  v.literal("cancelled"),
  v.literal("expired"),
  v.literal("failed")
)
const integrationOfferTransitionType = v.union(
  v.literal("created"),
  v.literal("delivered"),
  v.literal("cancelled"),
  v.literal("connected"),
  v.literal("failed"),
  v.literal("expired")
)

export const transitions = defineTable({
  organizationId: v.string(),
  subject: transitionSubject,
  type: transitionType,
  createdAt: v.number(),
})

type TransitionInputBase = {
  organizationId: string
}

export type ApprovalTransitionType = Infer<typeof approvalTransitionType>
export type IntegrationOfferTransitionType = Infer<
  typeof integrationOfferTransitionType
>
export type TransitionSubject = Infer<typeof transitionSubject>

type ApprovalTransitionInput = TransitionInputBase & {
  subject: Infer<typeof approvalSubject>
  type: ApprovalTransitionType
}
type IntegrationOfferTransitionInput = TransitionInputBase & {
  subject: Infer<typeof integrationOfferSubject>
  type: IntegrationOfferTransitionType
}
export type TransitionInput =
  | ApprovalTransitionInput
  | IntegrationOfferTransitionInput
