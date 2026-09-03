import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"
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

    if (run.job !== undefined && run.parentId === undefined) {
      return await getJobInput(ctx, { run })
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

  if (message === null || message.organizationId !== args.run.organizationId) {
    return null
  }

  const integration = await ctx.db.get(message.integrationId)

  if (
    integration === null ||
    integration.organizationId !== args.run.organizationId ||
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
    organization: await readApprovedFacts(ctx, args.run.organizationId),
    requester: personContext.requester,
    place: await readPlaceContext(ctx, message),
    timezone: personContext.timezone,
    workstreams: await readWorkstreamRoster(ctx, args.run.organizationId),
  }
}

async function getJobInput(
  ctx: QueryCtx,
  args: {
    run: Doc<"runs">
  }
) {
  if (args.run.job === undefined) {
    return null
  }

  const event =
    args.run.cause.type === "event"
      ? await ctx.db.get(args.run.cause.eventId)
      : null
  const integration =
    event === null || event.organizationId !== args.run.organizationId
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
    type: "job" as const,
    access,
    instructions,
    run: args.run,
    event:
      event !== null && event.organizationId === args.run.organizationId
        ? event
        : null,
    integration:
      integration !== null &&
      integration.organizationId === args.run.organizationId
        ? integration
        : null,
    integrations: grantedIntegrations,
    organization: await readApprovedFacts(ctx, args.run.organizationId),
    requester: personContext.requester,
    timezone: personContext.timezone,
    workstreams: await readWorkstreamRoster(ctx, args.run.organizationId),
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
    ...(access === undefined ? {} : { access }),
    integrations: grantedIntegrations,
    organization: await readApprovedFacts(ctx, args.run.organizationId),
    requester: personContext.requester,
    timezone: personContext.timezone,
    workstreams: await readWorkstreamRoster(ctx, args.run.organizationId),
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

/** The outcome a run reported through `finish_run`; its parent reads it back
 *  from `wait_for_agents`. The tool layer caps the text before it gets here. */
export const finish = internalMutation({
  args: {
    runId: v.id("runs"),
    result: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, { result: args.result })

    return null
  },
})

async function listActiveIntegrations(ctx: QueryCtx, run: Doc<"runs">) {
  return await listActiveIntegrationsForPrincipal(ctx, {
    principal: run.principal,
    organizationId: run.organizationId,
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
