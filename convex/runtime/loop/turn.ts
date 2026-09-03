import { type Infer, v } from "convex/values"
import { isTerminalRunStatus } from "../../../contracts/runtime/runs"
import { internal } from "../../_generated/api"
import {
  type ActionCtx,
  internalAction,
  internalMutation,
} from "../../_generated/server"
import { recordTrace } from "../../runs/execution/traces/write"
import { appendTranscript } from "../../runs/execution/transcript/data"
import { waiterWake } from "../../runs/execution/waiters/schema"
import { toolSnapshot } from "../../runs/schema"
import { drainSession } from "../../sessions/drain"
import { type LoadedRuntime, loadRuntime } from "../context"
import { buildRuntimePrompt } from "../context/response"
import { OpenRouterModel } from "../model/chat"
import { ActionPlatform, type AgentRuntime } from "../platform"
import { RemoteSandbox } from "../sandbox/remote"
import { syncSessionReactions } from "../sessions"
import { runAct } from "./act"
import { runModelTurn } from "./model"
import { drainedBatchMessages } from "./transcript"

const actOutcome = v.union(
  v.object({
    status: v.union(
      v.literal("completed"),
      v.literal("continue"),
      v.literal("failed"),
      v.literal("stopped")
    ),
  }),
  v.object({ eventId: v.string(), status: v.literal("parked") })
)

type ActOutcome = Infer<typeof actOutcome>

/** The run's first step: prepare it, drain what the conversation already
 *  said, and report whether there is anything left to run. */
export const open = internalAction({
  args: {
    runId: v.id("runs"),
  },
  returns: v.union(v.literal("opened"), v.literal("skipped")),
  handler: async (ctx, args): Promise<"opened" | "skipped"> => {
    const loaded = await loadRuntime(ctx, args.runId)

    if (isTerminalRunStatus(loaded.run.status)) {
      return "skipped" as const
    }

    await syncReactions(ctx, loaded)
    await ctx.runMutation(internal.runtime.loop.turn.prepare, {
      runId: args.runId,
      ...(loaded.session === null ? {} : { sessionId: loaded.session._id }),
      tools: loaded.tools,
    })

    return "opened" as const
  },
})

export const model = internalAction({
  args: {
    runId: v.id("runs"),
    turn: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const loaded = await loadRuntime(ctx, args.runId)

    await syncReactions(ctx, loaded)
    await runModelTurn({
      model: new OpenRouterModel(),
      prompt: buildRuntimePrompt(
        loaded.input,
        loaded.activeSurface,
        loaded.permissions,
        loaded.skills,
        { person: loaded.session?.recency?.requester ?? null }
      ),
      runtime: agentRuntime(ctx, loaded),
      turn: args.turn,
    })

    return null
  },
})

export const act = internalAction({
  args: {
    runId: v.id("runs"),
    turn: v.number(),
    wake: v.optional(waiterWake),
  },
  returns: actOutcome,
  handler: async (ctx, args): Promise<ActOutcome> => {
    const loaded = await loadRuntime(ctx, args.runId)

    return await runAct({
      runtime: agentRuntime(ctx, loaded),
      turn: args.turn,
      ...(args.wake === undefined ? {} : { wake: args.wake }),
    })
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
      const drained = await drainSession(ctx, { sessionId: args.sessionId })

      await appendTranscript(ctx, args.runId, drainedBatchMessages(drained))
    }

    return null
  },
})

function agentRuntime(ctx: ActionCtx, loaded: LoadedRuntime): AgentRuntime {
  return {
    context: loaded.context,
    platform: new ActionPlatform(ctx, loaded.context),
    sandbox: new RemoteSandbox(
      ctx,
      loaded.run._id,
      loaded.context.run.sandboxId
    ),
  }
}

async function syncReactions(ctx: ActionCtx, loaded: LoadedRuntime) {
  if (loaded.session !== null) {
    await syncSessionReactions(ctx, loaded.session._id)
  }
}
