import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../_generated/server"
import { hasIntegrationTools } from "../automations/access"
import { recentConversation } from "../routing/history"

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
    !isMessageIntegration(integration.integration)
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
    messageIntegration: integration.integration,
    run: args.run,
    message,
    integration,
    integrations,
    conversation: await recentConversation(ctx, message, integration),
    routing: await getMessageRouting(ctx, message._id),
  }
}

function isMessageIntegration(
  integration: string
): integration is "github" | "linear" | "slack" {
  return (
    integration === "github" ||
    integration === "linear" ||
    integration === "slack"
  )
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
  const integration =
    event === null || event.tenantId !== args.run.tenantId
      ? null
      : await ctx.db.get(event.integrationId)
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
    integration:
      integration !== null && integration.tenantId === args.run.tenantId
        ? integration
        : null,
    integrations: integrations.filter((integration) =>
      hasIntegrationTools(automation.access, integration._id)
    ),
  }
}

async function getMessageRouting(ctx: QueryCtx, messageId: Id<"messages">) {
  const routing = await ctx.db
    .query("routing")
    .withIndex("by_message", (query) => query.eq("messageId", messageId))
    .first()

  return routing === null
    ? null
    : {
        reply: routing.reply ?? null,
        route: routing.route,
      }
}

export const get = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId)
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
