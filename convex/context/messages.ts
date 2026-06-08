import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import {
  findConversationActivation,
  startMessageExecution,
} from "../attention/activations"
import { getSlackBotUserId } from "../providers/slack/data"
import { isMiloRelevantMessage } from "../providers/slack/gate"

export const recordSlackMessage = internalMutation({
  args: {
    accountId: v.string(),
    type: v.string(),
    externalId: v.string(),
    actorId: v.optional(v.string()),
    conversationId: v.optional(v.string()),
    text: v.optional(v.string()),
    observedAt: v.optional(v.number()),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const integration = await findActiveSlackIntegration(ctx, {
      accountId: args.accountId,
    })

    if (integration === null) {
      return { status: "missing_integration" as const }
    }

    if (isIntegrationBotMessage(args.actorId, integration.data)) {
      return { status: "ignored_bot" as const }
    }

    const existingMessage = await ctx.db
      .query("messages")
      .withIndex("by_external_id", (query) =>
        query.eq("externalId", args.externalId)
      )
      .first()

    if (existingMessage !== null) {
      return { status: "duplicate" as const }
    }

    const messageId = await insertMessage(ctx, {
      args,
      integration,
    })
    const now = Date.now()

    const activation = await findConversationActivation(ctx, {
      tenantId: integration.tenantId,
      integrationId: integration._id,
      conversationId: args.conversationId,
    })

    if (
      activation === null &&
      !isMiloRelevantMessage(args.text, args.type, args.data, integration.data)
    ) {
      return { status: "ignored" as const, messageId }
    }

    return await startMessageExecution(ctx, {
      activation,
      integration,
      messageId,
      messageType: args.type,
      messageExternalId: args.externalId,
      conversationId: args.conversationId ?? args.externalId,
      now,
    })
  },
})

async function findActiveSlackIntegration(
  ctx: MutationCtx,
  args: { accountId: string }
) {
  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_provider_account", (query) =>
      query.eq("provider", "slack").eq("accountId", args.accountId)
    )
    .first()

  if (integration === null || integration.status !== "active") {
    return null
  }

  return integration
}

async function insertMessage(
  ctx: MutationCtx,
  input: {
    args: {
      type: string
      externalId: string
      actorId?: string
      conversationId?: string
      text?: string
      observedAt?: number
      data?: unknown
    }
    integration: Doc<"integrations">
  }
): Promise<Id<"messages">> {
  return await ctx.db.insert("messages", {
    tenantId: input.integration.tenantId,
    integrationId: input.integration._id,
    type: input.args.type,
    externalId: input.args.externalId,
    actorId: input.args.actorId,
    conversationId: input.args.conversationId,
    text: input.args.text,
    data: input.args.data,
    observedAt: input.args.observedAt,
    createdAt: Date.now(),
  })
}

function isIntegrationBotMessage(actorId: string | undefined, data: unknown) {
  if (actorId === undefined) {
    return false
  }

  return actorId === getSlackBotUserId(data)
}
