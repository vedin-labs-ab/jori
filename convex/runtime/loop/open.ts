import { v } from "convex/values"
import { isTerminalRunStatus } from "../../../contracts/runtime/runs"
import { internal } from "../../_generated/api"
import { internalAction, internalMutation } from "../../_generated/server"
import { recordTrace } from "../../runs/execution/traces/write"
import { appendTranscript } from "../../runs/execution/transcript/data"
import { toolSnapshot } from "../../runs/schema"
import { drainSession } from "../../sessions/drain"
import { loadRuntime } from "../context"
import { syncSessionReactions } from "../sessions"
import { drainedBatchMessages } from "./transcript"

/** The run's first step: prepare it, drain what the conversation already
 *  said, and report whether there is anything left to run. */
export const step = internalAction({
  args: {
    runId: v.id("runs"),
  },
  returns: v.union(v.literal("opened"), v.literal("skipped")),
  handler: async (ctx, args): Promise<"opened" | "skipped"> => {
    const loaded = await loadRuntime(ctx, args.runId)

    if (isTerminalRunStatus(loaded.input.run.status)) {
      return "skipped"
    }

    if (loaded.session !== null) {
      await syncSessionReactions(ctx, loaded.session._id)
    }

    await ctx.runMutation(internal.runtime.loop.open.prepare, {
      runId: args.runId,
      ...(loaded.session === null ? {} : { sessionId: loaded.session._id }),
      tools: loaded.tools,
    })

    return "opened"
  },
})

/**
 * Everything the run needs to become live, in one transaction: the prepared
 * and started traces, the flip out of the queue, and the first drain. A
 * failed prepare consumes nothing, and a second one finds the traces already
 * written and the session already drained.
 */
export const prepare = internalMutation({
  args: {
    runId: v.id("runs"),
    sessionId: v.optional(v.id("sessions")),
    tools: toolSnapshot,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    if (run === null) {
      return null
    }

    await recordTrace(ctx, {
      run,
      key: `run:${args.runId}:prepared`,
      type: "run.prepared",
      data: { tools: args.tools },
    })

    if (isTerminalRunStatus(run.status)) {
      return null
    }

    await recordTrace(ctx, {
      key: `${args.runId}:0:run.started`,
      run,
      sequence: 0,
      type: "run.started",
    })

    if (run.status === "queued") {
      await ctx.db.patch(args.runId, { status: "running" })
    }

    if (args.sessionId !== undefined) {
      const drained = await drainSession(ctx, {
        sessionId: args.sessionId,
        runId: args.runId,
      })

      await appendTranscript(ctx, args.runId, drainedBatchMessages(drained))
    }

    return null
  },
})
