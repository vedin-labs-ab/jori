import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import {
  findThreadActivation,
  startMessageActivation,
} from "../attention/activations"
import { isMiloRelevantMessage } from "../providers/slack/gate"

export const recordSlackEvent = internalMutation({
  args: {
    accountId: v.string(),
    type: v.string(),
    providerId: v.string(),
    actorId: v.optional(v.string()),
    containerId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    text: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_provider_account", (query) =>
        query.eq("provider", "slack").eq("accountId", args.accountId)
      )
      .first()

    if (integration === null || integration.status !== "active") {
      return { status: "missing_integration" as const }
    }

    const existingMessage = await ctx.db
      .query("messages")
      .withIndex("by_provider_id", (query) =>
        query.eq("providerId", args.providerId)
      )
      .first()

    if (existingMessage !== null) {
      return { status: "duplicate" as const }
    }

    const now = Date.now()
    const messageId = await ctx.db.insert("messages", {
      tenantId: integration.tenantId,
      integrationId: integration._id,
      type: args.type,
      providerId: args.providerId,
      actorId: args.actorId,
      containerId: args.containerId,
      threadId: args.threadId,
      text: args.text,
      data: args.data,
      occurredAt: args.occurredAt,
      createdAt: now,
    })

    const activation = await findThreadActivation(ctx, {
      tenantId: integration.tenantId,
      integrationId: integration._id,
      threadId: args.threadId,
    })

    if (
      activation === null &&
      !isMiloRelevantMessage(args.text, args.type, args.data, integration.data)
    ) {
      return { status: "ignored" as const, messageId }
    }

    return await startMessageActivation(ctx, {
      integration,
      messageId,
      provider: "slack",
      providerId: args.providerId,
      threadId: args.threadId ?? args.providerId,
      now,
    })
  },
})
