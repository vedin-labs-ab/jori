import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  type MutationCtx,
} from "../_generated/server"
import { setSlackThreadStatus } from "../broker/tools/slack"
import { readProviderDataString } from "../providers/data"
import { formatRuntimeError } from "./shared"

const claimLeaseMs = 2 * 60 * 1000
const statusRefreshMs = 90 * 1000

const slackRunState = v.union(
  v.literal("working"),
  v.literal("completed"),
  v.literal("failed")
)

type SlackRunState = Doc<"runtimeSlackStatuses">["state"]

type SlackPublishTarget = {
  integration: Doc<"integrations">
  status: Doc<"runtimeSlackStatuses">
  statusText: string
}

export async function createSlackRunStatus(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    message: Doc<"messages">
    runId: Id<"runs">
    now: number
  }
) {
  const target = readSlackTarget(args.integration, args.message)

  if (target === null) {
    return
  }

  const existing = await findSlackStatus(ctx, args.runId)

  if (existing !== null) {
    return
  }

  await ctx.db.insert("runtimeSlackStatuses", {
    tenantId: args.integration.tenantId,
    runId: args.runId,
    integrationId: args.integration._id,
    channelId: target.channelId,
    threadTs: target.threadTs,
    state: "working",
    createdAt: args.now,
    updatedAt: args.now,
  })
  await schedulePublish(ctx, args.runId)
}

export async function recordSlackRunState(
  ctx: MutationCtx,
  args: {
    error?: string
    runId: Id<"runs">
    state: SlackRunState
  }
) {
  const status = await findSlackStatus(ctx, args.runId)

  if (status === null) {
    return
  }

  const shouldPublish =
    status.state !== args.state || status.lastDeliveredState !== args.state

  await ctx.db.patch(status._id, {
    lastError: args.error,
    state: args.state,
    updatedAt: Date.now(),
  })

  if (shouldPublish) {
    await schedulePublish(ctx, args.runId)
  }
}

export const publish = internalAction({
  args: {
    runId: v.id("runs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const target = await claimPublish(ctx, args.runId)

    if (target === null) {
      return null
    }

    try {
      await deliverSlackStatus(target)

      await ctx.runMutation(internal.runtime.slack.recordDelivery, {
        runId: args.runId,
        state: target.status.state,
        now: Date.now(),
      })
    } catch (error) {
      await ctx.runMutation(internal.runtime.slack.recordFailure, {
        error: formatRuntimeError(error),
        runId: args.runId,
        now: Date.now(),
      })
    }

    return null
  },
})

export const claim = internalMutation({
  args: {
    now: v.number(),
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const status = await findSlackStatus(ctx, args.runId)

    if (status === null || !needsPublish(status, args.now)) {
      return null
    }

    const integration = await ctx.db.get(status.integrationId)

    if (
      integration === null ||
      integration.status !== "active" ||
      integration.integration !== "slack"
    ) {
      return null
    }

    await ctx.db.patch(status._id, {
      publishClaimUntil: args.now + claimLeaseMs,
      updatedAt: args.now,
    })

    return { integration, status, statusText: assistantStatusText(status) }
  },
})

export const recordDelivery = internalMutation({
  args: {
    now: v.number(),
    runId: v.id("runs"),
    state: slackRunState,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const status = await findSlackStatus(ctx, args.runId)

    if (status === null) {
      return null
    }

    await ctx.db.patch(status._id, {
      deliveredAt: args.now,
      lastDeliveredState: args.state,
      lastError: undefined,
      messageTs: undefined,
      publishClaimUntil: undefined,
      updatedAt: args.now,
    })

    if (status.state !== args.state) {
      await schedulePublish(ctx, args.runId)
    } else if (args.state === "working") {
      await schedulePublish(ctx, args.runId, statusRefreshMs)
    }

    return null
  },
})

export const recordFailure = internalMutation({
  args: {
    error: v.string(),
    now: v.number(),
    runId: v.id("runs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const status = await findSlackStatus(ctx, args.runId)

    if (status === null) {
      return null
    }

    await ctx.db.patch(status._id, {
      lastError: args.error,
      publishClaimUntil: undefined,
      updatedAt: args.now,
    })

    return null
  },
})

async function claimPublish(ctx: ActionCtx, runId: Id<"runs">) {
  return (await ctx.runMutation(internal.runtime.slack.claim, {
    runId,
    now: Date.now(),
  })) as SlackPublishTarget | null
}

async function deliverSlackStatus(target: SlackPublishTarget) {
  return await setSlackThreadStatus(target.integration, {
    channelId: target.status.channelId,
    status: target.statusText,
    threadTs: target.status.threadTs,
  })
}

async function findSlackStatus(ctx: MutationCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("runtimeSlackStatuses")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .first()
}

function needsPublish(status: Doc<"runtimeSlackStatuses">, now: number) {
  if (
    status.publishClaimUntil !== undefined &&
    status.publishClaimUntil > now
  ) {
    return false
  }

  return (
    status.lastDeliveredState !== status.state ||
    status.lastError !== undefined ||
    needsWorkingRefresh(status, now)
  )
}

function needsWorkingRefresh(status: Doc<"runtimeSlackStatuses">, now: number) {
  return (
    status.state === "working" &&
    (status.deliveredAt === undefined ||
      status.deliveredAt <= now - statusRefreshMs)
  )
}

function readSlackTarget(
  integration: Doc<"integrations">,
  message: Doc<"messages">
) {
  if (integration.integration !== "slack") {
    return null
  }

  const channelId = readProviderDataString(message.data, "channelId")
  const messageTs = readProviderDataString(message.data, "ts")

  if (channelId === undefined || messageTs === undefined) {
    return null
  }

  return {
    channelId,
    threadTs: readProviderDataString(message.data, "threadTs") ?? messageTs,
  }
}

function schedulePublish(ctx: MutationCtx, runId: Id<"runs">, delayMs = 0) {
  return ctx.scheduler.runAfter(delayMs, internal.runtime.slack.publish, {
    runId,
  })
}

function assistantStatusText(status: Doc<"runtimeSlackStatuses">) {
  if (status.state === "working") {
    return "is working..."
  }

  return ""
}
