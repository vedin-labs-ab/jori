import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  type ActionCtx,
  action,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"
import { reactionAddress, replyAddress } from "../messages/surface"
import {
  type AgentRuntimeInput,
  type MessageIntegration,
} from "../runs/agent/input"
import { requiredString } from "../shared/input"
import { requireWorkerSecret } from "./shared"
import { addSurfaceReaction } from "./surface/reaction"
import { optionalSlackBlocks, sendSurfaceReply } from "./surface/reply"
import { type ActiveSurfaceTool, activeSurfaceTools } from "./surface/tools"

type ActiveSurfaceState = {
  communicated: boolean
}

type ActiveSurface = {
  communicated: boolean
  surface: MessageIntegration
}

export async function loadActiveSurface(
  ctx: ActionCtx,
  input: AgentRuntimeInput,
  runId: Id<"runs">
): Promise<{
  state: ActiveSurface | null
  tools: ActiveSurfaceTool[]
}> {
  if (input.type !== "message" || replyAddress(input.message) === null) {
    return { state: null, tools: [] }
  }

  const current: ActiveSurfaceState = await ctx.runQuery(
    internal.runtime.surface.state,
    { runId }
  )

  return {
    state: {
      communicated: current.communicated,
      surface: input.messageIntegration,
    },
    tools: activeSurfaceTools(input.messageIntegration),
  }
}

export const state = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  returns: v.object({
    communicated: v.boolean(),
  }),
  handler: async (ctx, args): Promise<ActiveSurfaceState> => {
    return {
      communicated: await hasCompletedCommunicationTrace(ctx, args.runId),
    }
  },
})

export const sendReply = action({
  args: {
    runId: v.id("runs"),
    secret: v.string(),
    text: v.string(),
    blocks: v.optional(v.array(v.any())),
  },
  returns: v.object({
    status: v.literal("sent"),
  }),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const input = (await ctx.runQuery(internal.runs.records.getInputByRun, {
      runId: args.runId,
    })) as AgentRuntimeInput | null

    if (input === null || input.type !== "message") {
      throw new Error("Run has no active reply surface.")
    }

    if (input.integration.status !== "active") {
      throw new Error("Active reply integration is not active.")
    }

    const address = replyAddress(input.message)

    if (address === null) {
      throw new Error("Run has no active reply target.")
    }

    await sendSurfaceReply(ctx, input, address, {
      blocks: optionalSlackBlocks(args.blocks),
      text: requiredString(args.text, "text"),
    })

    return { status: "sent" as const }
  },
})

export const addReaction = action({
  args: {
    runId: v.id("runs"),
    secret: v.string(),
    emoji: v.string(),
  },
  returns: v.object({
    status: v.literal("sent"),
  }),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const input = (await ctx.runQuery(internal.runs.records.getInputByRun, {
      runId: args.runId,
    })) as AgentRuntimeInput | null

    if (input === null || input.type !== "message") {
      throw new Error("Run has no active surface.")
    }

    if (input.integration.status !== "active") {
      throw new Error("Active surface integration is not active.")
    }

    const address = reactionAddress(input.message)

    if (address === null) {
      throw new Error("Run has no active reaction target.")
    }

    await addSurfaceReaction(ctx, input, address, {
      emoji: requiredString(args.emoji, "emoji"),
    })

    return { status: "sent" as const }
  },
})

async function hasCompletedCommunicationTrace(
  ctx: QueryCtx,
  runId: Id<"runs">
) {
  const traces = await ctx.db
    .query("traces")
    .withIndex("by_run_and_timestamp", (query) => query.eq("runId", runId))
    .order("desc")
    .take(500)

  return traces.some(isCompletedCommunicationTrace)
}

function isCompletedCommunicationTrace(trace: Doc<"traces">) {
  const data = trace.data

  return (
    trace.type === "tool.completed" &&
    typeof data === "object" &&
    data !== null &&
    "name" in data &&
    (data.name === "send_reply" || data.name === "add_reaction")
  )
}
