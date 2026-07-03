import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import { type ApplyState, applyOp } from "./operations"
import { judgeOp } from "./review/ops"
import { sortOps } from "./rules"

const allowedSource = v.object({
  id: v.string(),
  observedAt: v.number(),
  integrationId: v.string(),
})

// Applies one judged review atomically: validates every op against the rules,
// writes beliefs, evidence, and journal, and completes the pass with stats.
// The only write path into beliefs besides console corrections.
export const apply = internalMutation({
  args: {
    passId: v.id("passes"),
    ops: v.array(judgeOp),
    invalid: v.number(),
    allowed: v.object({
      events: v.array(allowedSource),
      conversations: v.array(allowedSource),
    }),
    counts: v.object({
      beliefs: v.number(),
      events: v.number(),
      conversations: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const pass = await ctx.db.get(args.passId)

    if (pass === null || pass.status !== "running") {
      return
    }

    const state = createState(args)

    for (const op of sortOps(args.ops)) {
      await applyOp(ctx, pass, state, op)
    }

    await ctx.db.patch(args.passId, {
      status: "completed",
      endedAt: Date.now(),
      stats: {
        ...args.counts,
        created: state.created,
        updated: state.updated,
        merged: state.merged,
        closed: state.closed,
        discarded: state.discarded + args.invalid,
      },
    })
  },
})

function createState(args: {
  allowed: {
    events: { id: string; observedAt: number; integrationId: string }[]
    conversations: { id: string; observedAt: number; integrationId: string }[]
  }
}): ApplyState {
  return {
    allowed: {
      events: new Map(args.allowed.events.map((row) => [row.id, row])),
      conversations: new Map(
        args.allowed.conversations.map((row) => [row.id, row])
      ),
    },
    temp: new Map(),
    now: Date.now(),
    created: 0,
    updated: 0,
    merged: 0,
    closed: 0,
    discarded: 0,
  }
}
