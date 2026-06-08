import { v } from "convex/values"
import { type Doc, type Id } from "./_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "./_generated/server"
import { isMiloRelevantMessage } from "./slackGate"
import { createSignedSlackState } from "./slackShared"

export const createInstallState = mutation({
  args: {
    tenantId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      throw new Error("Unauthorized")
    }

    return await createSignedSlackState({
      tenantId: args.tenantId,
      createdBy: identity.subject,
      returnUrl: args.returnUrl,
      createdAt: Date.now(),
    })
  },
})

export const recordOAuthInstallation = internalMutation({
  args: {
    tenantId: v.string(),
    createdBy: v.string(),
    accountId: v.string(),
    tokenId: v.string(),
    teamName: v.optional(v.string()),
    botUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_provider_account", (query) =>
        query.eq("provider", "slack").eq("accountId", args.accountId)
      )
      .first()

    const data = {
      teamName: args.teamName,
      botUserId: args.botUserId,
    }

    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        tenantId: args.tenantId,
        tokenId: args.tokenId,
        status: "active",
        createdBy: args.createdBy,
        data,
      })

      return existing._id
    }

    return await ctx.db.insert("integrations", {
      tenantId: args.tenantId,
      provider: "slack",
      accountId: args.accountId,
      tokenId: args.tokenId,
      status: "active",
      createdBy: args.createdBy,
      createdAt: now,
      data,
    })
  },
})

export const recordEventMessage = internalMutation({
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

    const activatedThread = await findActivatedThread(ctx, {
      tenantId: integration.tenantId,
      integrationId: integration._id,
      threadId: args.threadId,
    })

    if (
      activatedThread === null &&
      !isMiloRelevantMessage(args.text, args.type, args.data, integration.data)
    ) {
      return { status: "ignored" as const, messageId }
    }

    return await startSlackRun(ctx, {
      integration,
      messageId,
      providerId: args.providerId,
      threadId: args.threadId ?? args.providerId,
      now,
    })
  },
})

async function findActivatedThread(
  ctx: MutationCtx,
  args: {
    tenantId: string
    integrationId: Id<"integrations">
    threadId: string | undefined
  }
) {
  if (args.threadId === undefined) {
    return null
  }

  const threadId = args.threadId

  return await ctx.db
    .query("activations")
    .withIndex("by_thread", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("integrationId", args.integrationId)
        .eq("threadId", threadId)
    )
    .first()
}

async function startSlackRun(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    messageId: Id<"messages">
    providerId: string
    threadId: string
    now: number
  }
) {
  const triggerId = await ctx.db.insert("triggers", {
    tenantId: args.integration.tenantId,
    messageId: args.messageId,
    type: "message",
    data: {
      provider: "slack",
      providerId: args.providerId,
    },
    createdAt: args.now,
  })

  const executionId = await ctx.db.insert("executions", {
    tenantId: args.integration.tenantId,
    status: "queued",
    createdAt: args.now,
  })

  const activationId = await ctx.db.insert("activations", {
    tenantId: args.integration.tenantId,
    triggerId,
    integrationId: args.integration._id,
    threadId: args.threadId,
    executionId,
    createdAt: args.now,
  })

  return {
    status: "started" as const,
    messageId: args.messageId,
    triggerId,
    executionId,
    activationId,
  }
}
