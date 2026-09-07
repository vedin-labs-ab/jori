import { type Infer } from "convex/values"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import { meterModelUsage } from "../../../billing/meter"
import { continuePendingConversationRun } from "../../../conversations/continuation"
import { recordUsageEnded } from "../../../usage/record"
import { stopRunChildren } from "../../tree"
import { clearRunDraft } from "../drafts/data"
import { wakeParentForTerminalRun } from "../waiters/data"
import { type traceData } from "./schema"
import { recordTrace } from "./write"

type TraceData = Infer<typeof traceData>

export async function recordWorkerTrace(
  ctx: MutationCtx,
  args: {
    callId?: string
    data?: TraceData
    key: string
    runId: Id<"runs">
    sequence?: number
    type: Doc<"traces">["type"]
  }
) {
  const run = await ctx.db.get(args.runId)

  if (run === null) {
    throw new Error("Run not found.")
  }

  if (run.status === "stopped") {
    return { created: false }
  }

  const created = await recordTrace(ctx, {
    ...args,
    run,
  })

  if (created) {
    await patchRunStatus(ctx, args)
    await patchSessionStatus(ctx, args)
    if (args.type === "run.completed" || args.type === "run.failed") {
      await wakeParentForTerminalRun(ctx, args.runId)
      // A terminal run takes its delegated subtree with it: children exist
      // for their parent, so nothing keeps running for a consumer that is
      // gone.
      await stopRunChildren(ctx, args.runId)
      // A reply still in the making has no turn left to finish it.
      await clearRunDraft(ctx, args.runId)
    }
    if (
      args.type === "model.completed" &&
      args.data !== undefined &&
      "usage" in args.data
    ) {
      await meterModelUsage(ctx, { run, tokens: args.data.usage.tokens })
      await recordTurnTokens(ctx, run._id, args.data.usage.tokens)
    }
  }

  return { created }
}

/** The one write per turn that lets the loop and the console read the
 *  run's context use straight off the run. */
async function recordTurnTokens(
  ctx: MutationCtx,
  runId: Id<"runs">,
  tokens: {
    cacheRead: number
    input: number
    output: number
    reasoning: number
  }
) {
  await ctx.db.patch(runId, {
    promptTokens: tokens.input,
    turnTokens: {
      cacheRead: tokens.cacheRead,
      input: tokens.input,
      output: tokens.output,
      reasoning: tokens.reasoning,
    },
  })
}

async function patchSessionStatus(
  ctx: MutationCtx,
  args: {
    runId: Id<"runs">
    type: Doc<"traces">["type"]
  }
) {
  if (args.type !== "run.completed" && args.type !== "run.failed") {
    return
  }

  await continuePendingConversationRun(ctx, {
    runId: args.runId,
    now: Date.now(),
  })
}

async function patchRunStatus(
  ctx: MutationCtx,
  args: {
    data?: TraceData
    runId: Id<"runs">
    type: Doc<"traces">["type"]
  }
) {
  const run = await ctx.db.get(args.runId)

  if (run === null || run.status === "stopped") {
    return
  }

  if (args.type === "run.started") {
    if (run.status === "queued" || run.status === "running") {
      await ctx.db.patch(args.runId, { status: "running" })
    }

    return
  }

  if (run.status !== "queued" && run.status !== "running") {
    return
  }

  // The status guards above make this the one transition out of a live run,
  // so the rollup increments on exactly the condition that ends it.
  if (args.type === "run.completed") {
    await ctx.db.patch(args.runId, completedRunPatch())
    await recordUsageEnded(ctx, { run, failed: false })
  } else if (args.type === "run.failed") {
    await ctx.db.patch(args.runId, {
      status: "failed",
      error: readRunFailedError(args.data),
      endedAt: Date.now(),
    })
    await recordUsageEnded(ctx, { run, failed: true })
  }
}

// The outcome itself is written by `finish_run`, not read back off the trace.
function completedRunPatch() {
  return {
    status: "completed" as const,
    error: undefined,
    endedAt: Date.now(),
  }
}

function readRunFailedError(data: TraceData | undefined) {
  if (data === undefined || !("error" in data)) {
    throw new Error("Run failed trace is missing an error.")
  }

  return data.error
}
