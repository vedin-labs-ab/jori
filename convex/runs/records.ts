import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../_generated/server"
import { readWorkstreamRoster } from "../deduction/roster"
import { listActiveIntegrationsForOwner } from "../integrations/data"
import { recentConversation } from "../messages/history"
import { readApprovedFacts } from "../organization/profile"
import { readPersonTimezone } from "../persons/timezone"
import { readPlaceContext } from "../places/context"
import {
  hasIntegrationTools,
  isMessageIntegration,
} from "../shared/integrations"

export const getInputByRun = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    if (run === null) {
      return null
    }

    if (run.cause.type === "message") {
      return await getMessageInput(ctx, { run })
    }

    if (run.automationId !== undefined) {
      return await getAutomationInput(ctx, { run })
    }

    return await getInstructionInput(ctx, { run })
  },
})

async function getMessageInput(
  ctx: QueryCtx,
  args: {
    run: Doc<"runs">
  }
) {
  if (args.run.cause.type !== "message") {
    return null
  }

  const message = await ctx.db.get(args.run.cause.messageId)

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
    conversation: await recentConversation(ctx, message),
    organization: await readApprovedFacts(ctx, args.run.tenantId),
    place: await readPlaceContext(ctx, message),
    timezone: await readPersonTimezone(ctx, args.run.createdBy),
    workstreams: await readWorkstreamRoster(ctx, args.run.tenantId),
  }
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
    args.run.cause.type === "event"
      ? await ctx.db.get(args.run.cause.eventId)
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
    organization: await readApprovedFacts(ctx, args.run.tenantId),
    timezone: await readPersonTimezone(ctx, automation.createdBy),
    workstreams: await readWorkstreamRoster(ctx, args.run.tenantId),
  }
}

async function getInstructionInput(
  ctx: QueryCtx,
  args: {
    run: Doc<"runs">
  }
) {
  const instructions = args.run.instructions?.trim()

  if (instructions === undefined || instructions === "") {
    return null
  }

  const access = args.run.access
  const integrations = await listActiveIntegrations(
    ctx,
    args.run.tenantId,
    args.run.createdBy
  )

  return {
    type: "instruction" as const,
    run: args.run,
    instructions,
    ...(access === undefined ? {} : { access }),
    integrations:
      access === undefined
        ? integrations
        : integrations.filter((integration) =>
            hasIntegrationTools(access, integration._id)
          ),
    organization: await readApprovedFacts(ctx, args.run.tenantId),
    timezone: await readPersonTimezone(ctx, args.run.createdBy),
    workstreams: await readWorkstreamRoster(ctx, args.run.tenantId),
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
  ownerId: Id<"persons"> | undefined
) {
  return await listActiveIntegrationsForOwner(ctx, {
    ownerId,
    tenantId,
  })
}
