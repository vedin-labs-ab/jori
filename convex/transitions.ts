import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { internal } from "./_generated/api"
import { type MutationCtx } from "./_generated/server"

const approvalSubject = v.object({
  kind: v.literal("approval"),
  id: v.id("approvals"),
})
const integrationOfferSubject = v.object({
  kind: v.literal("integrationOffer"),
  id: v.id("integrationOffers"),
})
const transitionSubject = v.union(approvalSubject, integrationOfferSubject)
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
  tenantId: v.string(),
  subject: transitionSubject,
  type: transitionType,
  createdAt: v.number(),
})
  .index("by_subject_and_created_at", [
    "subject.kind",
    "subject.id",
    "createdAt",
  ])
  .index("by_tenant_and_created_at", ["tenantId", "createdAt"])

type TransitionInputBase = {
  tenantId: string
  syncSurface?: boolean
}

export type ApprovalTransitionType = Infer<typeof approvalTransitionType>

type ApprovalTransitionInput = TransitionInputBase & {
  subject: Infer<typeof approvalSubject>
  type: ApprovalTransitionType
}
type IntegrationOfferTransitionInput = TransitionInputBase & {
  subject: Infer<typeof integrationOfferSubject>
  type: Infer<typeof integrationOfferTransitionType>
}
type TransitionInput = ApprovalTransitionInput | IntegrationOfferTransitionInput

export async function recordTransition(
  ctx: MutationCtx,
  args: TransitionInput
) {
  const createdAt = Date.now()

  await ctx.db.insert("transitions", {
    tenantId: args.tenantId,
    subject: args.subject,
    type: args.type,
    createdAt,
  })

  if (args.syncSurface === true) {
    await scheduleSurfaceSync(ctx, args.subject)
  }
}

async function scheduleSurfaceSync(
  ctx: MutationCtx,
  subject: TransitionInput["subject"]
) {
  switch (subject.kind) {
    case "approval":
      await ctx.scheduler.runAfter(0, internal.approvals.lifecycle.sync, {
        approvalId: subject.id,
      })
      return
    case "integrationOffer":
      await ctx.scheduler.runAfter(
        0,
        internal.integrations.offers.lifecycle.sync,
        {
          integrationOfferId: subject.id,
        }
      )
      return
  }
}
