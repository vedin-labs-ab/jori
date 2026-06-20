import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { findConversation, startMessageRun } from "../conversations/data"
import { resolveUserIdByEmail } from "../identity/identities"
import { queueReply } from "../runtime/replies/queue"
import { getActorEmail } from "../shared/actor"
import { continueTerminalSession } from "./continuation"
import { activeMessageIntegration, findRoutingByMessage } from "./data"
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
      await queueQuickReply(ctx, {
        message,
        routing: existing,
      })

      return { status: "routed" as const, routingId: existing._id }
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
  const reply = input.decision.reply
  const shouldReply = reply !== undefined && address !== null
  const routingId = await ctx.db.insert("routing", {
    messageId: input.message._id,
    route: input.decision.route,
    reply: input.decision.reply,
    runId: run.runId,
    createdAt: input.now,
  })

  if (shouldReply) {
    await queueReply(ctx, {
      kind: "quick",
      messageId: input.message._id,
      routingId,
      tenantId: input.message.tenantId,
      text: reply,
    })
  }

  await continueTerminalSession(ctx, {
    integration: input.integration,
    message: input.message,
    now: input.now,
    route: input.decision.route,
  })

  return {
    status: "routed" as const,
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
    externalId: input.message.conversationId,
  })
  const createdBy = await resolveUserIdByEmail(ctx, {
    tenantId: input.integration.tenantId,
    email: getActorEmail(input.message.actor),
  })
  const run = await startMessageRun(ctx, {
    conversation,
    integration: input.integration,
    message: input.message,
    createdBy,
    externalId: input.message.conversationId ?? input.message.externalId,
    now: input.now,
  })
  return { runId: run.runId }
}

async function queueQuickReply(
  ctx: MutationCtx,
  input: {
    message: Doc<"messages">
    routing: Doc<"routing">
  }
) {
  if (
    input.routing.reply === undefined ||
    replyAddress(input.message) === null
  ) {
    return
  }

  await queueReply(ctx, {
    kind: "quick",
    messageId: input.message._id,
    routingId: input.routing._id,
    tenantId: input.message.tenantId,
    text: input.routing.reply,
  })
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
