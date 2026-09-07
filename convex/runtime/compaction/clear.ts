import { v } from "convex/values"
import { isTerminalRunStatus } from "../../../contracts/runtime/runs"
import { type Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { recordWorkerTrace } from "../../runs/execution/traces/data"
import {
  clearKeepTurns,
  keepBoundary,
} from "../../runs/execution/transcript/compact"
import { listTranscriptRows } from "../../runs/execution/transcript/data"
import { compactionSequence } from "./plan"

/** The clearing step: tool results older than the last few turns read as
 *  stubs from here on. A mutation, since it moves a boundary and calls no
 *  model; running it again on the same turn moves nothing. */
export const step = internalMutation({
  args: { runId: v.id("runs"), turn: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await clearTranscript(ctx, args)
  },
})

export async function clearTranscript(
  ctx: MutationCtx,
  args: { runId: Id<"runs">; turn: number }
) {
  const run = await ctx.db.get(args.runId)

  if (run === null || isTerminalRunStatus(run.status)) {
    return null
  }

  const boundary = keepBoundary(
    await listTranscriptRows(ctx, run._id),
    clearKeepTurns
  )
  const previous = run.compaction?.clearedBefore
  // The boundary only ever moves forward: a retry that reads the same
  // transcript finds it where the first attempt left it.
  const clearedBefore =
    boundary !== null && boundary > (previous ?? 0) ? boundary : previous

  await ctx.db.patch(run._id, {
    compaction: {
      ...run.compaction,
      clearedAtTurn: args.turn,
      ...(clearedBefore === undefined ? {} : { clearedBefore }),
    },
  })

  if (clearedBefore === undefined || clearedBefore === previous) {
    return null
  }

  const sequence = compactionSequence(args.turn, "cleared")

  await recordWorkerTrace(ctx, {
    data: {
      kind: "cleared",
      fromOrder: previous ?? 1,
      toOrder: clearedBefore,
      tokensBefore: run.promptTokens ?? 0,
    },
    key: `${run._id}:${sequence}:transcript.compacted`,
    runId: run._id,
    sequence,
    type: "transcript.compacted",
  })

  return null
}
