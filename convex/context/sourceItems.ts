import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import {
  findConversationActivation,
  startSourceItemExecution,
} from "../attention/activations"
import { getSlackBotUserId } from "../providers/slack/data"
import { isMiloRelevantMessage } from "../providers/slack/gate"

export const recordSlackSourceItem = internalMutation({
  args: {
    externalAccountId: v.string(),
    kind: v.string(),
    externalId: v.string(),
    authorId: v.optional(v.string()),
    locationId: v.optional(v.string()),
    conversationId: v.optional(v.string()),
    content: v.optional(v.string()),
    observedAt: v.optional(v.number()),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const integration = await findActiveSlackIntegration(ctx, {
      externalAccountId: args.externalAccountId,
    })

    if (integration === null) {
      return { status: "missing_integration" as const }
    }

    if (isIntegrationBotSourceItem(args.authorId, integration.data)) {
      return { status: "ignored_bot" as const }
    }

    const existingSourceItem = await ctx.db
      .query("sourceItems")
      .withIndex("by_external_id", (query) =>
        query.eq("externalId", args.externalId)
      )
      .first()

    if (existingSourceItem !== null) {
      return { status: "duplicate" as const }
    }

    const sourceItemId = await insertSourceItem(ctx, {
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
      !isMiloRelevantMessage(
        args.content,
        args.kind,
        args.data,
        integration.data
      )
    ) {
      return { status: "ignored" as const, sourceItemId }
    }

    return await startSourceItemExecution(ctx, {
      activation,
      integration,
      sourceItemId,
      sourceKind: args.kind,
      sourceExternalId: args.externalId,
      conversationId: args.conversationId ?? args.externalId,
      now,
    })
  },
})

async function findActiveSlackIntegration(
  ctx: MutationCtx,
  args: { externalAccountId: string }
) {
  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_provider_external_account", (query) =>
      query
        .eq("provider", "slack")
        .eq("externalAccountId", args.externalAccountId)
    )
    .first()

  if (integration === null || integration.status !== "active") {
    return null
  }

  return integration
}

async function insertSourceItem(
  ctx: MutationCtx,
  input: {
    args: {
      kind: string
      externalId: string
      authorId?: string
      locationId?: string
      conversationId?: string
      content?: string
      observedAt?: number
      data?: unknown
    }
    integration: Doc<"integrations">
  }
): Promise<Id<"sourceItems">> {
  return await ctx.db.insert("sourceItems", {
    tenantId: input.integration.tenantId,
    integrationId: input.integration._id,
    kind: input.args.kind,
    externalId: input.args.externalId,
    authorId: input.args.authorId,
    locationId: input.args.locationId,
    conversationId: input.args.conversationId,
    content: input.args.content,
    data: input.args.data,
    observedAt: input.args.observedAt,
    createdAt: Date.now(),
  })
}

function isIntegrationBotSourceItem(
  authorId: string | undefined,
  data: unknown
) {
  if (authorId === undefined) {
    return false
  }

  return authorId === getSlackBotUserId(data)
}
