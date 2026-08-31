import { v } from "convex/values"
import { type Doc } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { resolveCitations, sortOps } from "../engine/rules"
import {
  allowedSource,
  completePass,
  createTracking,
  discard,
  requireRunningPass,
  toAllowedMaps,
} from "../engine/wire"
import { type EffortOp, effortOp } from "./contract"
import {
  applyCreate,
  applyJournal,
  applyMerge,
  applyUpdate,
  type EffortApplyState,
} from "./handlers"

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
      ...createTracking(args),
    }

    for (const op of sortOps(args.ops)) {
      await applyOp(ctx, pass, state, op)
    }

    await completePass(ctx, args.passId, state)
  },
})

async function applyOp(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: EffortApplyState,
  op: EffortOp
): Promise<void> {
  const sightings = resolveCitations(op.citations, state.allowed)

  if (sightings === null) {
    discard(state, op.op, "citation outside the pass input")

    return
  }

  if (sightings.length === 0) {
    discard(state, op.op, "missing citations")

    return
  }

  switch (op.op) {
    case "create":
      await applyCreate(ctx, pass, state, op, sightings)
      return
    case "update":
      await applyUpdate(ctx, pass, state, op, sightings)
      return
    case "journal":
      await applyJournal(ctx, pass, state, op, sightings)
      return
    case "merge":
      await applyMerge(ctx, pass, state, op, sightings)
  }
}
