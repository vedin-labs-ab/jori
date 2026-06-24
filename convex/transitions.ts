import { defineTable } from "convex/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { type Id } from "./_generated/dataModel"
import { type MutationCtx } from "./_generated/server"

const approvalTransitionType = v.union(
  v.literal("created"),
  v.literal("delivered"),
  v.literal("approved"),
  v.literal("denied"),
  v.literal("cancelled"),
  v.literal("expired")
)
const setupLinkTransitionType = v.union(
  v.literal("created"),
  v.literal("delivered"),
  v.literal("cancelled"),
  v.literal("connected"),
  v.literal("failed"),
  v.literal("expired")
)

const approvalTransition = v.object({
  tenantId: v.string(),
  subject: v.object({
    kind: v.literal("approval"),
    id: v.id("approvals"),
  }),
  type: approvalTransitionType,
  createdAt: v.number(),
})
const setupLinkTransition = v.object({
  tenantId: v.string(),
  subject: v.object({
    kind: v.literal("setupLink"),
    id: v.id("setupLinks"),
  }),
  type: setupLinkTransitionType,
  createdAt: v.number(),
})

export const transitions = defineTable(
  v.union(approvalTransition, setupLinkTransition)
)
  .index("by_subject_and_created_at", [
    "subject.kind",
    "subject.id",
    "createdAt",
  ])
  .index("by_tenant_and_created_at", ["tenantId", "createdAt"])

type ApprovalTransitionType =
  | "created"
  | "delivered"
  | "approved"
  | "denied"
  | "cancelled"
  | "expired"

type SetupLinkTransitionType =
  | "created"
  | "delivered"
  | "cancelled"
  | "connected"
  | "failed"
  | "expired"

type ApprovalTransitionInput = {
  tenantId: string
  subject: { kind: "approval"; id: Id<"approvals"> }
  type: ApprovalTransitionType
  syncSurface?: boolean
}
type SetupLinkTransitionInput = {
  tenantId: string
  subject: { kind: "setupLink"; id: Id<"setupLinks"> }
  type: SetupLinkTransitionType
  syncSurface?: boolean
}
type TransitionInput = ApprovalTransitionInput | SetupLinkTransitionInput

export async function recordTransition(
  ctx: MutationCtx,
  args: TransitionInput
) {
  const createdAt = Date.now()

  if (isApprovalTransition(args)) {
    await ctx.db.insert("transitions", {
      tenantId: args.tenantId,
      subject: args.subject,
      type: args.type,
      createdAt,
    })
  } else {
    await ctx.db.insert("transitions", {
      tenantId: args.tenantId,
      subject: args.subject,
      type: args.type,
      createdAt,
    })
  }

  if (args.syncSurface === true) {
    await scheduleSurfaceSync(ctx, args.subject)
  }
}

function isApprovalTransition(
  args: TransitionInput
): args is ApprovalTransitionInput {
  return args.subject.kind === "approval"
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
    case "setupLink":
      await ctx.scheduler.runAfter(
        0,
        internal.integrations.setup.lifecycle.sync,
        {
          setupLinkId: subject.id,
        }
      )
      return
  }
}
