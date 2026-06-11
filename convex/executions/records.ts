import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"

export const getInputByTrigger = internalQuery({
  args: {
    triggerId: v.id("triggers"),
  },
  handler: async (ctx, args) => {
    const trigger = await ctx.db.get(args.triggerId)

    if (trigger === null) {
      return null
    }

    if (trigger.type === "message") {
      return await getMessageInput(ctx, { trigger })
    }

    if (trigger.type === "scheduled") {
      return await getScheduledInput(ctx, { trigger })
    }

    return null
  },
})

async function getMessageInput(
  ctx: QueryCtx,
  args: {
    trigger: Doc<"triggers">
  }
) {
  if (args.trigger.messageId === undefined) {
    return null
  }

  const message = await ctx.db.get(args.trigger.messageId)

  if (message === null || message.tenantId !== args.trigger.tenantId) {
    return null
  }

  const integration = await ctx.db.get(message.integrationId)

  if (
    integration === null ||
    integration.tenantId !== args.trigger.tenantId ||
    !isMessageProvider(integration.provider)
  ) {
    return null
  }

  const integrations = await listActiveIntegrations(
    ctx,
    args.trigger.tenantId,
    args.trigger.createdBy
  )

  return {
    type: "message" as const,
    provider: integration.provider,
    trigger: args.trigger,
    message,
    integration,
    integrations,
  }
}

function isMessageProvider(
  provider: string
): provider is "github" | "linear" | "slack" {
  return provider === "github" || provider === "linear" || provider === "slack"
}

async function getScheduledInput(
  ctx: QueryCtx,
  args: {
    trigger: Doc<"triggers">
  }
) {
  if (args.trigger.scheduleId === undefined) {
    return null
  }

  const schedule = await ctx.db.get(args.trigger.scheduleId)

  if (schedule === null || schedule.tenantId !== args.trigger.tenantId) {
    return null
  }

  const integrations = await listActiveIntegrations(
    ctx,
    schedule.tenantId,
    schedule.createdBy
  )
  const integration =
    integrations.find((candidate) => candidate.provider === "slack") ?? null

  return {
    type: "scheduled" as const,
    trigger: args.trigger,
    schedule,
    integration,
    integrations,
  }
}

export const create = internalMutation({
  args: {
    triggerId: v.id("triggers"),
    promptId: v.id("_storage"),
    approvalId: v.optional(v.id("approvals")),
  },
  handler: async (ctx, args): Promise<Id<"executions"> | null> => {
    const trigger = await ctx.db.get(args.triggerId)

    if (trigger === null) {
      return null
    }

    return await ctx.db.insert("executions", {
      tenantId: trigger.tenantId,
      triggerId: trigger._id,
      approvalId: args.approvalId,
      promptId: args.promptId,
      status: "queued",
      createdBy: trigger.createdBy,
      createdAt: Date.now(),
    })
  },
})

export const get = internalQuery({
  args: {
    executionId: v.id("executions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.executionId)
  },
})

async function listActiveIntegrations(
  ctx: QueryCtx,
  tenantId: string,
  ownerId: string | undefined
) {
  const integrations = await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_status", (query) =>
      query.eq("tenantId", tenantId).eq("status", "active")
    )
    .collect()

  return integrations.filter((integration) => {
    if (integration.scope !== "user") {
      return true
    }

    return ownerId !== undefined && integration.ownerId === ownerId
  })
}

export const getActiveByHash = internalQuery({
  args: {
    hash: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("executions")
      .withIndex("by_hash", (query) => query.eq("hash", args.hash))
      .first()

    if (execution === null || execution.status !== "running") {
      return null
    }

    return execution
  },
})

export const markRunning = internalMutation({
  args: {
    executionId: v.id("executions"),
    sandboxId: v.string(),
    traceHost: v.string(),
    traceToken: v.string(),
    hash: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)

    if (execution === null || execution.status === "stopped") {
      return false
    }

    await ctx.db.patch(args.executionId, {
      status: "running",
      sandboxId: args.sandboxId,
      traceHost: args.traceHost,
      traceToken: args.traceToken,
      hash: args.hash,
    })

    return true
  },
})

export const finish = internalMutation({
  args: {
    tenantId: v.string(),
    executionId: v.id("executions"),
    fileId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    if (args.fileId !== undefined) {
      await ctx.db.insert("traces", {
        tenantId: args.tenantId,
        executionId: args.executionId,
        fileId: args.fileId,
        createdAt: Date.now(),
      })
    }

    // A user stop already settled the row; only the trace is still welcome.
    const execution = await ctx.db.get(args.executionId)
    const wasStopped = execution?.status === "stopped"

    await ctx.db.patch(args.executionId, {
      ...(wasStopped
        ? {}
        : {
            status: args.status,
            error: args.status === "failed" ? args.error : undefined,
            finishedAt: Date.now(),
          }),
      hash: undefined,
      traceHost: undefined,
      traceToken: undefined,
    })
  },
})
