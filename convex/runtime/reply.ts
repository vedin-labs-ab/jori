import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  type ActionCtx,
  action,
  internalMutation,
  type MutationCtx,
} from "../_generated/server"
import { postSlackMessage, setSlackThreadStatus } from "../broker/tools/slack"
import { readProviderDataString } from "../providers/data"
import { formatRuntimeError, requireWorkerSecret } from "./shared"

const claimLeaseMs = 2 * 60 * 1000

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
      internal.runtime.reply.claimSlackFinal,
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

export const claimSlackFinal = internalMutation({
  args: {
    now: v.number(),
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const status = await findSlackStatus(ctx, args.runId)

    if (status === null || status.messageTs !== undefined) {
      return null
    }

    const integration = await ctx.db.get(status.integrationId)

    if (!isActiveSlackIntegration(integration)) {
      return null
    }

    await ctx.db.patch(status._id, {
      lastError: undefined,
      publishClaimUntil: args.now + claimLeaseMs,
      state: "completed",
      updatedAt: args.now,
    })

    return {
      integration,
      status: { ...status, state: "completed" },
    }
  },
})

export const recordSlackFinal = internalMutation({
  args: {
    messageTs: v.string(),
    now: v.number(),
    runId: v.id("runs"),
    statusCleared: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const status = await findSlackStatus(ctx, args.runId)

    if (status === null) {
      return null
    }

    await ctx.db.patch(status._id, {
      deliveredAt: args.statusCleared ? args.now : status.deliveredAt,
      lastDeliveredState: args.statusCleared
        ? "completed"
        : status.lastDeliveredState,
      lastError: undefined,
      messageTs: args.messageTs,
      publishClaimUntil: undefined,
      state: "completed",
      updatedAt: args.now,
    })

    return null
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

    await ctx.runMutation(internal.runtime.reply.recordSlackFinal, {
      messageTs,
      runId,
      statusCleared,
      now: Date.now(),
    })

    return { delivered: true }
  } catch (error) {
    await recordSlackFailure(ctx, runId, error)
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
    await recordSlackFailure(ctx, runId, error)

    return false
  }
}

async function recordSlackFailure(
  ctx: ActionCtx,
  runId: Id<"runs">,
  error: unknown
) {
  await ctx.runMutation(internal.runtime.slack.recordFailure, {
    error: formatRuntimeError(error),
    runId,
    now: Date.now(),
  })
}

async function findSlackStatus(ctx: MutationCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("runtimeSlackStatuses")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .first()
}

function isActiveSlackIntegration(
  integration: Doc<"integrations"> | null
): integration is Doc<"integrations"> {
  return (
    integration !== null &&
    integration.status === "active" &&
    integration.integration === "slack"
  )
}
