import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx, action } from "../_generated/server"
import { postSlackMessage, setSlackThreadStatus } from "../broker/tools/slack"
import { readProviderDataString } from "../providers/data"
import { formatRuntimeError, requireWorkerSecret } from "./shared"

type SlackFinalTarget = {
  integration: Doc<"integrations">
  status: Doc<"runtimeSlackStatuses">
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
      internal.runtime.slack.source.claimSlackFinal,
      {
        runId: args.runId,
        now: Date.now(),
      }
    )) as SlackFinalTarget | null

    if (target === null) {
      return { delivered: false }
    }

    return await deliverSlackFinal(ctx, args.runId, args.content, target)
  },
})

async function deliverSlackFinal(
  ctx: ActionCtx,
  runId: Id<"runs">,
  content: string,
  target: SlackFinalTarget
) {
  const statusCleared = await clearSlackStatus(ctx, runId, target)

  try {
    const response = await postSlackMessage(target.integration, {
      channel: target.status.channelId,
      text: content,
      thread_ts: target.status.threadTs,
    })
    const messageTs = readProviderDataString(response, "ts")

    if (messageTs === undefined) {
      throw new Error("Slack final reply response is missing ts")
    }

    await ctx.runMutation(internal.runtime.slack.source.recordSlackFinal, {
      messageTs,
      runId,
      statusCleared,
      now: Date.now(),
    })

    return { delivered: true }
  } catch (error) {
    await recordSlackFinalFailure(ctx, runId, error)
    throw error
  }
}

async function clearSlackStatus(
  ctx: ActionCtx,
  runId: Id<"runs">,
  target: SlackFinalTarget
) {
  try {
    await setSlackThreadStatus(target.integration, {
      channelId: target.status.channelId,
      status: "",
      threadTs: target.status.threadTs,
    })

    return true
  } catch (error) {
    await recordSlackStatusFailure(ctx, runId, error)

    return false
  }
}

async function recordSlackStatusFailure(
  ctx: ActionCtx,
  runId: Id<"runs">,
  error: unknown
) {
  await ctx.runMutation(internal.runtime.slack.status.recordFailure, {
    error: formatRuntimeError(error),
    runId,
    now: Date.now(),
  })
}

async function recordSlackFinalFailure(
  ctx: ActionCtx,
  runId: Id<"runs">,
  error: unknown
) {
  await ctx.runMutation(internal.runtime.slack.source.releaseSlackFinalClaim, {
    error: formatRuntimeError(error),
    runId,
    now: Date.now(),
  })
}
