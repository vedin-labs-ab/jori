import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../_generated/server"
import { readRunArtifactContext } from "../artifacts/context"
import { readWorkstreamRoster } from "../deduction/roster"
import { listActiveIntegrationsForPrincipal } from "../integrations/data"
import { recentConversation } from "../messages/history"
import { readApprovedFacts } from "../organization/profile"
import { readRequesterContext } from "../persons/profile/context"
import { readPersonTimezone } from "../persons/profile/timezone"
import { readPlaceContext } from "../places/context"
import {
  hasIntegrationTools,
  isMessageIntegration,
} from "../shared/integrations"
import { executionPrincipalPersonId } from "./principal"

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

    if (run.automationId !== undefined && run.parentId === undefined) {
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

  const integrations = await listActiveIntegrations(ctx, args.run)
  const personContext = await readPrincipalContext(ctx, args.run, integrations)

  return {
    type: "message" as const,
    messageIntegration: integration.integration,
    run: args.run,
    message,
    integration,
    integrations,
    conversation: await recentConversation(ctx, message),
    organization: await readApprovedFacts(ctx, args.run.tenantId),
    requester: personContext.requester,
    place: await readPlaceContext(ctx, message),
    timezone: personContext.timezone,
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

  const event =
    args.run.cause.type === "event"
      ? await ctx.db.get(args.run.cause.eventId)
      : null
  const integration =
    event === null || event.tenantId !== args.run.tenantId
      ? null
      : await ctx.db.get(event.integrationId)
  const integrations = await listActiveIntegrations(ctx, args.run)
  const access = args.run.access
  const instructions = args.run.instructions?.trim()

  if (
    access === undefined ||
    instructions === undefined ||
    instructions === ""
  ) {
    return null
  }

  const grantedIntegrations = integrations.filter((integration) =>
    hasIntegrationTools(access, integration._id)
  )
  const personContext = await readPrincipalContext(
    ctx,
    args.run,
    grantedIntegrations
  )

  return {
    type: "automation" as const,
    access,
    instructions,
    run: args.run,
    artifact: await readRunArtifactContext(ctx, args.run),
    event:
      event !== null && event.tenantId === args.run.tenantId ? event : null,
    integration:
      integration !== null && integration.tenantId === args.run.tenantId
        ? integration
        : null,
    integrations: grantedIntegrations,
    organization: await readApprovedFacts(ctx, args.run.tenantId),
    requester: personContext.requester,
    timezone: personContext.timezone,
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
  const integrations = await listActiveIntegrations(ctx, args.run)

  const grantedIntegrations =
    access === undefined
      ? integrations
      : integrations.filter((integration) =>
          hasIntegrationTools(access, integration._id)
        )
  const personContext = await readPrincipalContext(
    ctx,
    args.run,
    grantedIntegrations
  )

  return {
    type: "instruction" as const,
    run: args.run,
    instructions,
    artifact: await readRunArtifactContext(ctx, args.run),
    ...(access === undefined ? {} : { access }),
    integrations: grantedIntegrations,
    organization: await readApprovedFacts(ctx, args.run.tenantId),
    requester: personContext.requester,
    timezone: personContext.timezone,
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

async function listActiveIntegrations(ctx: QueryCtx, run: Doc<"runs">) {
  return await listActiveIntegrationsForPrincipal(ctx, {
    principal: run.principal,
    tenantId: run.tenantId,
  })
}

async function readPrincipalContext(
  ctx: QueryCtx,
  run: Doc<"runs">,
  integrations: Doc<"integrations">[]
) {
  const personId = executionPrincipalPersonId(run.principal)

  if (personId === undefined) {
    return { requester: null, timezone: null }
  }

  return {
    requester: await readRequesterContext(ctx, { personId, integrations }),
    timezone: await readPersonTimezone(ctx, personId),
  }
}
