import { v } from "convex/values"
import { type Doc, type Id } from "./_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
} from "./_generated/server"
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

    if (!isMiloRelevantMessage(args.text, args.type, integration.data)) {
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

export const getExecutionInput = internalQuery({
  args: {
    executionId: v.id("executions"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.executionId)
    const message = await ctx.db.get(args.messageId)

    if (execution === null || message === null) {
      return null
    }

    const integration = await ctx.db.get(message.integrationId)

    if (integration === null) {
      return null
    }

    return { execution, message, integration }
  },
})

export const markExecutionRunning = internalMutation({
  args: {
    executionId: v.id("executions"),
    sandboxId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: "running",
      sandboxId: args.sandboxId,
    })
  },
})

export const finishExecution = internalMutation({
  args: {
    tenantId: v.string(),
    executionId: v.id("executions"),
    fileId: v.id("_storage"),
    status: v.union(v.literal("completed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("traces", {
      tenantId: args.tenantId,
      executionId: args.executionId,
      fileId: args.fileId,
      createdAt: Date.now(),
    })

    await ctx.db.patch(args.executionId, {
      status: args.status,
      finishedAt: Date.now(),
    })
  },
})

function isMiloRelevantMessage(
  text: string | undefined,
  type: string,
  data: unknown
) {
  if (type === "app_mention") {
    return true
  }

  if (text === undefined) {
    return false
  }

  const botUserId = getBotUserId(data)

  if (botUserId !== undefined && text.includes(`<@${botUserId}>`)) {
    return true
  }

  return /\bmilo\b/i.test(text)
}

function getBotUserId(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "botUserId" in data &&
    typeof data.botUserId === "string"
  ) {
    return data.botUserId
  }

  return undefined
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
