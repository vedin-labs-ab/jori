import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import { findConversation, startMessageRun } from "../conversations/data"
import { resolveUserIdByEmail } from "../identity/identities"
import { getActorEmail } from "../shared/actor"
import { continueTerminalSession } from "./continuation"
import {
  activeMessageIntegration,
  findRoutingByMessage,
  hasActiveClaim,
  routingReplyClaimMs,
} from "./data"
import { routingRoute } from "./schema"
import { replyAddress } from "./surface"

const routingDecision = v.object({
  error: v.optional(v.string()),
  model: v.optional(v.string()),
  reply: v.optional(v.string()),
  route: routingRoute,
})

export const applyDecision = internalMutation({
  args: {
    decision: routingDecision,
    messageId: v.id("messages"),
    now: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)

    if (message === null) {
      return { status: "missing" as const }
    }

    const integration = await activeMessageIntegration(ctx, message)

    if (integration === null) {
      return { status: "missing" as const }
    }

    const existing = await findRoutingByMessage(ctx, message._id)

    if (existing !== null) {
      return await claimPendingReply(ctx, {
        integration,
        message,
        now: args.now,
        routing: existing,
      })
    }

    return await createRouting(ctx, {
      decision: normalizeDecision(args.decision),
      integration,
      message,
      now: args.now,
    })
  },
})

async function createRouting(
  ctx: MutationCtx,
  input: {
    decision: RoutingDecision
    integration: Doc<"integrations">
    message: Doc<"messages">
    now: number
  }
) {
  const run = await maybeStartAgentRun(ctx, input)
  const address = replyAddress(input.message)
  const shouldReply = input.decision.reply !== undefined && address !== null
  const routingId = await ctx.db.insert("routing", {
    tenantId: input.message.tenantId,
    integrationId: input.message.integrationId,
    messageId: input.message._id,
    conversationId: input.message.conversationId,
    route: input.decision.route,
    reply: input.decision.reply,
    model: input.decision.model,
    error: input.decision.error,
    runId: run.runId,
    executionId: run.executionId,
    replyClaimUntil: shouldReply ? input.now + routingReplyClaimMs : undefined,
    createdAt: input.now,
    updatedAt: input.now,
  })

  await continueTerminalSession(ctx, {
    integration: input.integration,
    message: input.message,
    now: input.now,
    route: input.decision.route,
  })

  return {
    status: "routed" as const,
    reply: shouldReply
      ? {
          address,
          integration: input.integration,
          routingId,
          text: input.decision.reply,
        }
      : null,
    routingId,
  }
}

async function maybeStartAgentRun(
  ctx: MutationCtx,
  input: {
    decision: RoutingDecision
    integration: Doc<"integrations">
    message: Doc<"messages">
    now: number
  }
) {
  if (input.decision.route !== "agent") {
    return {}
  }

  const conversation = await findConversation(ctx, {
    tenantId: input.integration.tenantId,
    integrationId: input.integration._id,
    conversationId: input.message.conversationId,
  })
  const createdBy = await resolveUserIdByEmail(ctx, {
    tenantId: input.integration.tenantId,
    email: getActorEmail(input.message.actor),
  })
  const run = await startMessageRun(ctx, {
    conversation,
    integration: input.integration,
    message: input.message,
    conversationKey: input.message.conversationId ?? input.message.externalId,
    createdBy,
    now: input.now,
  })
  const executionId =
    run.runId === undefined ? undefined : await findExecutionId(ctx, run.runId)

  return { executionId, runId: run.runId }
}

async function claimPendingReply(
  ctx: MutationCtx,
  input: {
    integration: Doc<"integrations">
    message: Doc<"messages">
    now: number
    routing: Doc<"routing">
  }
) {
  const address = replyAddress(input.message)

  if (
    input.routing.reply === undefined ||
    input.routing.replyMessageTs !== undefined ||
    address === null ||
    hasActiveClaim(input.routing.replyClaimUntil, input.now)
  ) {
    return { status: "routed" as const, reply: null }
  }

  await ctx.db.patch(input.routing._id, {
    replyClaimUntil: input.now + routingReplyClaimMs,
    replyError: undefined,
    updatedAt: input.now,
  })

  return {
    status: "routed" as const,
    reply: {
      address,
      integration: input.integration,
      routingId: input.routing._id,
      text: input.routing.reply,
    },
  }
}

type RoutingDecision = {
  error?: string
  model?: string
  reply?: string
  route: "agent" | "ignore" | "respond"
}

function normalizeDecision(decision: RoutingDecision): RoutingDecision {
  const reply = normalizeReply(decision.reply)

  if (decision.route === "respond" && reply === undefined) {
    return { ...decision, reply: undefined, route: "ignore" }
  }

  if (decision.route === "ignore") {
    return { ...decision, reply: undefined }
  }

  return { ...decision, reply }
}

function normalizeReply(reply: string | undefined) {
  const value = reply?.trim()

  return value === "" ? undefined : value
}

async function findExecutionId(ctx: QueryCtx, runId: Id<"runs">) {
  const execution = await ctx.db
    .query("executions")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .first()

  return execution?._id
}
