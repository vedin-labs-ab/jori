import { v } from "convex/values"
import { type Doc } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { resolveCitations, sortOps } from "../engine/rules"
import {
  allowedSource,
  requireRunningPass,
  statCounts,
  toAllowedMaps,
} from "../engine/wire"
import {
  applyCreate,
  applyJournal,
  applyMerge,
  applyUpdate,
  type EffortApplyState,
} from "./operations"
import { type EffortOp, effortOp } from "./ops"

// Applies one effort review atomically: validates every op against the
// rules, writes efforts, evidence, and journal, and completes the pass with
// stats. Assertions about work need support: every effort op cites.
export const apply = internalMutation({
  args: {
    passId: v.id("passes"),
    ops: v.array(effortOp),
    invalid: v.number(),
    allowed: v.object({
      events: v.array(allowedSource),
      conversations: v.array(allowedSource),
    }),
    context: v.number(),
    activity: v.number(),
  },
  handler: async (ctx, args) => {
    const pass = await requireRunningPass(ctx, args.passId)

    if (pass === null) {
      return
    }

    const state: EffortApplyState = {
      allowed: toAllowedMaps(args.allowed),
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
  state: EffortApplyState,
  op: EffortOp
) {
  const sightings = resolveCitations(op.citations, state.allowed)

  if (sightings === null || sightings.length === 0) {
    state.counts.discarded += 1

    return
  }

  switch (op.op) {
    case "create":
      return applyCreate(ctx, pass, state, op, sightings)
    case "update":
      return applyUpdate(ctx, pass, state, op, sightings)
    case "journal":
      return applyJournal(ctx, pass, state, op, sightings)
    case "merge":
      return applyMerge(ctx, pass, state, op, sightings)
  }
}
