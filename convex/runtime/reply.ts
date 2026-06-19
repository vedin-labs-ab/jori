import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx, action } from "../_generated/server"
import { postSlackMessage } from "../broker/tools/slack"
import { readProviderDataString } from "../providers/data"
import { formatRuntimeError, requireWorkerSecret } from "./shared"

type SlackFinalTarget = {
  channelId: string
  integration: Doc<"integrations">
  routingId: Id<"routing">
  threadTs: string
}

export const deliverFinal = action({
  args: {
    content: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.object({
    delivered: v.boolean(),
  }),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    if (args.content.trim() === "") {
      return { delivered: false }
    }

    const target = (await ctx.runMutation(
      internal.routing.replies.claimFinalSlackReply,
      { runId: args.runId, now: Date.now() }
    )) as SlackFinalTarget | null

    if (target === null) {
      return { delivered: false }
    }

    return await deliverSlackFinal(ctx, args.content, target)
  },
})

async function deliverSlackFinal(
  ctx: ActionCtx,
  content: string,
  target: SlackFinalTarget
) {
  try {
    const response = await postSlackMessage(target.integration, {
      channel: target.channelId,
      text: content,
      thread_ts: target.threadTs,
    })
    const messageTs = readProviderDataString(response, "ts")

    if (messageTs === undefined) {
      throw new Error("Slack final reply response is missing ts")
    }

    await ctx.runMutation(internal.routing.replies.recordFinalSlackReply, {
      messageTs,
      routingId: target.routingId,
    })

    return { delivered: true }
  } catch (error) {
    await recordSlackFinalFailure(ctx, target.routingId, error)
    throw error
  }
}

async function recordSlackFinalFailure(
  ctx: ActionCtx,
  routingId: Id<"routing">,
  error: unknown
) {
  await ctx.runMutation(internal.routing.replies.releaseFinalSlackReply, {
    error: formatRuntimeError(error),
    routingId,
  })
}
