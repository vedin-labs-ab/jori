import { v } from "convex/values"
import { isSurfaceCommunicationTool } from "../../contracts/runtime/surface"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  type ActionCtx,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"
import { messageMatchesReplyTargetIdentifier } from "../messages/identifiers"
import { optionalSlackBlocks, sendSurfaceReply } from "../messages/reply"
import { replyAddress } from "../messages/targets"
import { type AgentRuntimeInput } from "../runs/agent/input"
import { optionalString, requiredString } from "../shared/input"
import { type MessageSurface } from "../shared/integrations"
import { requireMessageSurfaceInput } from "./surface/input"
import { findVisibleMessage } from "./surface/target"
import { type ActiveSurfaceTool, activeSurfaceTools } from "./surface/tools"

type ActiveSurfaceState = {
  communicated: boolean
}

type ActiveSurface = {
  communicated: boolean
  surface: MessageSurface
  target: string | null
}

/** The reply target lives on the session, which the drain moves as the
 *  conversation moves, so a run started in a channel follows it into a
 *  thread without recomputing it from the first message. */
export async function loadActiveSurface(
  ctx: ActionCtx,
  args: {
    input: AgentRuntimeInput
    runId: Id<"runs">
    target: string | null
  }
): Promise<{
  state: ActiveSurface | null
  tools: ActiveSurfaceTool[]
}> {
  const input = args.input

  if (input.type !== "message" || replyAddress(input.message) === null) {
    return { state: null, tools: [] }
  }

  const current: ActiveSurfaceState = await ctx.runQuery(
    internal.runtime.surface.state,
    { runId: args.runId }
  )

  return {
    state: {
      communicated: current.communicated,
      surface: input.surface,
      target: args.target,
    },
    tools: activeSurfaceTools(input.surface),
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

export const canUseReplyTarget = internalQuery({
  args: {
    messageId: v.id("messages"),
    target: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)

    if (message === null) {
      return false
    }

    const match = await findVisibleMessage(ctx, message, (candidate) =>
      messageMatchesReplyTargetIdentifier(candidate, args.target)
    )

    return match !== null
  },
})

export async function sendRunReply(
  ctx: ActionCtx,
  args: {
    blocks?: unknown[]
    parts?: unknown[]
    runId: Id<"runs">
    target?: string
    text: string
  }
) {
  const input = await requireMessageSurfaceInput(ctx, {
    runId: args.runId,
    surface: "reply",
  })

  const target = normalizeReplyTarget(args.target)
  const address = replyAddress(input.message, target)

  if (address === null) {
    throw new Error("Run has no active reply target.")
  }

  if (
    target !== undefined &&
    !(await canReplyTo(ctx, input.message._id, target))
  ) {
    throw new Error(
      "send_reply target is not available in the active conversation."
    )
  }

  await sendSurfaceReply(ctx, input, address, {
    blocks: optionalSlackBlocks(args.blocks),
    parts: args.parts,
    text: requiredString(args.text, "text"),
  })

  return { status: "sent" as const }
}

async function canReplyTo(
  ctx: ActionCtx,
  messageId: Id<"messages">,
  target: string
) {
  return await ctx.runQuery(internal.runtime.surface.canUseReplyTarget, {
    messageId,
    target,
  })
}

function normalizeReplyTarget(value: unknown) {
  const target = optionalString(value)

  if (value !== undefined && target === undefined) {
    throw new Error("target must be a non-empty string.")
  }

  return target
}

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
  if (trace.type !== "tool.completed") {
    return false
  }

  return isSurfaceCommunicationTool(trace.data.tool.name)
}
