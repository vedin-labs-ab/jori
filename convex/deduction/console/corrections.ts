import { v } from "convex/values"
import { type Id } from "../../_generated/dataModel"
import { type MutationCtx, mutation } from "../../_generated/server"
import { requireTenantAccess } from "../../identity/access"
import { ensureCurrentPerson } from "../../persons/clerk"
import { createPersonActor } from "../../shared/actor"
import { type BeliefStatus } from "../schema"

// Console corrections are the only write path into beliefs besides the pass
// applier. Adoption decisions (confirm, reject, close, reopen, restore) move
// status without locking; editing locks the belief so the judge won't rewrite
// what a person wrote.

const target = { tenantId: v.string(), workstreamId: v.id("beliefs") }

export const confirm = mutation({
  args: target,
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    await transition(ctx, args, ["proposed"], "confirmed")
  },
})

export const reject = mutation({
  args: target,
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    await transition(ctx, args, ["proposed"], "rejected")
  },
})

export const close = mutation({
  args: target,
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    await transition(ctx, args, ["proposed", "confirmed"], "closed")
  },
})

export const reopen = mutation({
  args: target,
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    await transition(ctx, args, ["closed"], "confirmed")
  },
})

export const restore = mutation({
  args: target,
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)
    await transition(ctx, args, ["rejected"], "proposed")
  },
})

export const rename = mutation({
  args: { ...target, name: v.string(), brief: v.string() },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const belief = await requireWorkstream(
      ctx,
      args.tenantId,
      args.workstreamId
    )
    const name = args.name.trim()
    const brief = args.brief.trim()

    if (name === "" || brief === "") {
      throw new Error("Name and brief are required.")
    }

    await ctx.db.patch(belief._id, {
      name,
      brief,
      lockedBy: await currentActor(ctx, args.tenantId),
      updatedAt: Date.now(),
    })
  },
})

export const merge = mutation({
  args: { ...target, intoId: v.id("beliefs") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const belief = await requireWorkstream(
      ctx,
      args.tenantId,
      args.workstreamId
    )
    const into = await requireWorkstream(ctx, args.tenantId, args.intoId)

    if (belief._id === into._id) {
      throw new Error("A workstream cannot merge into itself.")
    }

    await ctx.db.patch(belief._id, {
      supersededBy: into._id,
      updatedAt: Date.now(),
    })
  },
})

export const setLock = mutation({
  args: { ...target, locked: v.boolean() },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const belief = await requireWorkstream(
      ctx,
      args.tenantId,
      args.workstreamId
    )

    await ctx.db.patch(belief._id, {
      lockedBy: args.locked
        ? await currentActor(ctx, args.tenantId)
        : undefined,
      updatedAt: Date.now(),
    })
  },
})

async function transition(
  ctx: MutationCtx,
  args: { tenantId: string; workstreamId: Id<"beliefs"> },
  from: BeliefStatus[],
  to: BeliefStatus
) {
  const belief = await requireWorkstream(ctx, args.tenantId, args.workstreamId)

  if (!from.includes(belief.status)) {
    throw new Error(`Cannot move a ${belief.status} workstream to ${to}.`)
  }

  await ctx.db.patch(belief._id, { status: to, updatedAt: Date.now() })
}

// Callers guard tenant access first; this helper only loads and validates.
async function requireWorkstream(
  ctx: MutationCtx,
  tenantId: string,
  workstreamId: Id<"beliefs">
) {
  const belief = await ctx.db.get(workstreamId)

  if (
    belief === null ||
    belief.tenantId !== tenantId ||
    belief.kind !== "workstream" ||
    belief.supersededBy !== undefined
  ) {
    throw new Error("Workstream not found.")
  }

  return belief
}

async function currentActor(ctx: MutationCtx, tenantId: string) {
  return createPersonActor(await ensureCurrentPerson(ctx, tenantId))
}
