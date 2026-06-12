import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"
import { getIntegrationAccess } from "../automations/access"

export const getInputByRun = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    if (run === null) {
      return null
    }

    if (run.reason.type === "message") {
      return await getMessageInput(ctx, { run })
    }

    if (run.automationId !== undefined) {
      return await getAutomationInput(ctx, { run })
    }

    return null
  },
})

async function getMessageInput(
  ctx: QueryCtx,
  args: {
    run: Doc<"runs">
  }
) {
  if (args.run.reason.type !== "message") {
    return null
  }

  const message = await ctx.db.get(args.run.reason.messageId)

  if (message === null || message.tenantId !== args.run.tenantId) {
    return null
  }

  const integration = await ctx.db.get(message.integrationId)

  if (
    integration === null ||
    integration.tenantId !== args.run.tenantId ||
    !isMessageProvider(integration.provider)
  ) {
    return null
  }

  const integrations = await listActiveIntegrations(
    ctx,
    args.run.tenantId,
    args.run.createdBy
  )

  return {
    type: "message" as const,
    provider: integration.provider,
    run: args.run,
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

async function getAutomationInput(
  ctx: QueryCtx,
  args: {
    run: Doc<"runs">
  }
) {
  if (args.run.automationId === undefined) {
    return null
  }

  const automation = await ctx.db.get(args.run.automationId)

  if (automation === null || automation.tenantId !== args.run.tenantId) {
    return null
  }

  const event =
    args.run.reason.type === "event"
      ? await ctx.db.get(args.run.reason.eventId)
      : null
  const integrations = await listActiveIntegrations(
    ctx,
    automation.tenantId,
    automation.createdBy
  )

  return {
    type: "automation" as const,
    run: args.run,
    automation,
    event:
      event !== null && event.tenantId === args.run.tenantId ? event : null,
    integration: null,
    integrations: integrations.filter(
      (integration) =>
        getIntegrationAccess(automation.access, integration._id) !== "none"
    ),
  }
}

export const create = internalMutation({
  args: {
    runId: v.id("runs"),
    promptId: v.id("_storage"),
    approvalId: v.optional(v.id("approvals")),
  },
  handler: async (ctx, args): Promise<Id<"executions"> | null> => {
    const run = await ctx.db.get(args.runId)

    if (run === null) {
      return null
    }

    return await ctx.db.insert("executions", {
      tenantId: run.tenantId,
      runId: run._id,
      approvalId: args.approvalId,
      promptId: args.promptId,
      status: "queued",
      createdBy: run.createdBy,
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
    trace: v.object({
      host: v.string(),
      token: v.string(),
    }),
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
      trace: args.trace,
      hash: args.hash,
    })

    return true
  },
})

export const finish = internalMutation({
  args: {
    executionId: v.id("executions"),
    fileId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
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
      trace:
        args.fileId === undefined
          ? undefined
          : {
              fileId: args.fileId,
            },
    })
  },
})
