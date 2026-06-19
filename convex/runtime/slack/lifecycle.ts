import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { readProviderDataString } from "../../providers/data"

type SlackRunState = Doc<"runtimeSlackStatuses">["state"]

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

async function findSlackStatus(ctx: MutationCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("runtimeSlackStatuses")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .first()
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
  return ctx.scheduler.runAfter(
    delayMs,
    internal.runtime.slack.status.publish,
    {
      runId,
    }
  )
}
