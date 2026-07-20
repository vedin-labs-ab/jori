import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx, mutation } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { moveEffort } from "../deduction/engine/sightings"
import { type BeliefStatus } from "../deduction/schema"

// Console corrections are the only write path into beliefs besides the pass
// applier. Adoption decisions move status; archive keeps a concluded
// workstream in history without leaving it in the active roster. Assign is
// the structural pen: moving an effort corrects membership without ever
// editing derived text, and survives re-derivation.

const target = { organizationId: v.string(), workstreamId: v.id("beliefs") }

export const assign = mutation({
  args: { ...target, effortId: v.id("efforts") },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    const belief = await requireWorkstream(
      ctx,
      args.organizationId,
      args.workstreamId
    )
    const effort = await ctx.db.get(args.effortId)

    if (
      effort === null ||
      effort.organizationId !== args.organizationId ||
      effort.supersededBy !== undefined
    ) {
      throw new Error("Effort not found.")
    }

    await moveEffort(ctx, effort, belief._id, Date.now())
  },
})

export const confirm = mutation({
  args: target,
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    await transition(ctx, args, ["proposed"], "confirmed")
  },
})

export const reject = mutation({
  args: target,
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    await transition(ctx, args, ["proposed"], "rejected")
  },
})

export const archive = mutation({
  args: target,
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    await transition(ctx, args, ["proposed", "confirmed"], "closed")
  },
})

export const reopen = mutation({
  args: target,
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    await transition(ctx, args, ["closed"], "confirmed")
  },
})

export const restore = mutation({
  args: target,
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    await transition(ctx, args, ["rejected"], "proposed")
  },
})

async function transition(
  ctx: MutationCtx,
  args: { organizationId: string; workstreamId: Id<"beliefs"> },
  from: BeliefStatus[],
  to: BeliefStatus
) {
  const belief = await requireWorkstream(
    ctx,
    args.organizationId,
    args.workstreamId
  )

  if (!from.includes(belief.status)) {
    throw new Error(`Cannot move a ${belief.status} workstream to ${to}.`)
  }

  await ctx.db.patch(belief._id, { status: to, updatedAt: Date.now() })
}

// Callers guard organization access first; this helper only loads and validates.
async function requireWorkstream(
  ctx: MutationCtx,
  organizationId: string,
  workstreamId: Id<"beliefs">
) {
  const belief = await ctx.db.get(workstreamId)

  if (
    belief === null ||
    belief.organizationId !== organizationId ||
    belief.kind !== "workstream" ||
    belief.supersededBy !== undefined
  ) {
    throw new Error("Workstream not found.")
  }

  return belief
}
