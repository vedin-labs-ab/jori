import { v } from "convex/values"
import { type Doc } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { resolveCitations, sortOps } from "../engine/rules"
import { allowedSource, requireRunningPass, statCounts } from "../engine/wire"
import { applyAssign, type WorkstreamApplyState } from "./members"
import { applyCreate, applyMerge, applyStatus, applyUpdate } from "./operations"
import { type WorkstreamOp, workstreamOp } from "./ops"

// Applies one workstream review atomically. This edge owns the kind: every
// belief it writes is a workstream. Wording claims (create, update) need
// citations; status and merge may ride on evidence already accumulated;
// assign is its own evidence.
export const apply = internalMutation({
  args: {
    passId: v.id("passes"),
    ops: v.array(workstreamOp),
    invalid: v.number(),
    allowed: v.object({ efforts: v.array(allowedSource) }),
    context: v.number(),
    activity: v.number(),
  },
  handler: async (ctx, args) => {
    const pass = await requireRunningPass(ctx, args.passId)

    if (pass === null) {
      return
    }

    const state: WorkstreamApplyState = {
      allowed: {
        events: new Map(),
        conversations: new Map(),
        efforts: new Map(args.allowed.efforts.map((row) => [row.id, row])),
      },
      temp: new Map(),
      now: Date.now(),
      counts: statCounts(args),
    }

    for (const op of sortOps(args.ops)) {
      await applyOp(ctx, pass, state, op)
    }

    await ctx.db.patch(args.passId, {
      status: "completed",
      endedAt: Date.now(),
      stats: state.counts,
    })
  },
})

async function applyOp(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: WorkstreamApplyState,
  op: WorkstreamOp
) {
  if (op.op === "assign") {
    return applyAssign(ctx, pass, state, op)
  }

  const sightings = resolveCitations(op.citations, state.allowed)
  const needsCitations = op.op === "create" || op.op === "update"

  if (sightings === null || (needsCitations && sightings.length === 0)) {
    state.counts.discarded += 1

    return
  }

  switch (op.op) {
    case "create":
      return applyCreate(ctx, pass, state, op, sightings)
    case "update":
      return applyUpdate(ctx, pass, state, op, sightings)
    case "status":
      return applyStatus(ctx, pass, state, op, sightings)
    case "merge":
      return applyMerge(ctx, pass, state, op, sightings)
  }
}
