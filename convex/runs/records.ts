import { v } from "convex/values"
import { isTerminalRunStatus } from "../../contracts/runtime/runs"
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
import { runExecutionIsCurrent } from "../sessions/execution"
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
      return await getMessageInput(ctx, run)
    }

    if (run.job !== undefined && run.parentId === undefined) {
      return await getJobInput(ctx, run)
    }

    return await getInstructionInput(ctx, run)
  },
})

async function getMessageInput(ctx: QueryCtx, run: Doc<"runs">) {
  if (run.cause.type !== "message") {
    return null
  }

  const message = await ctx.db.get(run.cause.messageId)

  if (message === null || message.organizationId !== run.organizationId) {
    return null
  }

  const integration =
    message.surface === "console"
      ? null
      : await readMessageIntegration(ctx, message)

  if (message.surface !== "console" && integration === null) {
    return null
  }

  const integrations = await listActiveIntegrations(ctx, run)

  return {
    type: "message" as const,
    surface: message.surface,
    message,
    integration,
    ...(await readInputContext(ctx, run, integrations)),
    conversation: await recentConversation(ctx, message, run.principal),
    place: await readPlaceContext(ctx, message),
  }
}

/** The row a provider message arrived through, when it still belongs to the
 *  message's organization and is a surface that carries conversations. */
async function readMessageIntegration(ctx: QueryCtx, message: Doc<"messages">) {
  const integration =
    message.integrationId === undefined
      ? null
      : await ctx.db.get(message.integrationId)

  return integration !== null &&
    integration.organizationId === message.organizationId &&
    isMessageIntegration(integration.integration)
    ? integration
    : null
}

async function getJobInput(ctx: QueryCtx, run: Doc<"runs">) {
  if (run.job === undefined) {
    return null
  }

  const event =
    run.cause.type === "event" ? await ctx.db.get(run.cause.eventId) : null
  const integration =
    event === null || event.organizationId !== run.organizationId
      ? null
      : await ctx.db.get(event.integrationId)
  const integrations = await listActiveIntegrations(ctx, run)
  const access = run.access
  const instructions = run.instructions?.trim()

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

  return {
    type: "job" as const,
    access,
    instructions,
    event:
      event !== null && event.organizationId === run.organizationId
        ? event
        : null,
    integration:
      integration !== null && integration.organizationId === run.organizationId
        ? integration
        : null,
    ...(await readInputContext(ctx, run, grantedIntegrations)),
  }
}

async function getInstructionInput(ctx: QueryCtx, run: Doc<"runs">) {
  const instructions = run.instructions?.trim()

  if (instructions === undefined || instructions === "") {
    return null
  }

  const access = run.access
  const integrations = await listActiveIntegrations(ctx, run)

  const grantedIntegrations =
    access === undefined
      ? integrations
      : integrations.filter((integration) =>
          hasIntegrationTools(access, integration._id)
        )

  return {
    type: "instruction" as const,
    instructions,
    ...(access === undefined ? {} : { access }),
    ...(await readInputContext(ctx, run, grantedIntegrations)),
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
    const run = await ctx.db.get(args.runId)

    if (
      run === null ||
      isTerminalRunStatus(run.status) ||
      !(await runExecutionIsCurrent(ctx, run))
    ) {
      return null
    }

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

/** Shared prompt context, using only the integrations selected for this input. */
async function readInputContext(
  ctx: QueryCtx,
  run: Doc<"runs">,
  integrations: Doc<"integrations">[]
) {
  const personId = executionPrincipalPersonId(run.principal)

  return {
    run,
    integrations,
    requester: await readRequesterContext(ctx, { personId, integrations }),
    timezone: await readPersonTimezone(ctx, personId),
    organization: await readApprovedFacts(ctx, run.organizationId),
    workstreams: await readWorkstreamRoster(ctx, run.organizationId),
  }
}
