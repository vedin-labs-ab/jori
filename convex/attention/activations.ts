import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"

export async function findThreadActivation(
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

export async function startMessageActivation(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    messageId: Id<"messages">
    provider: "slack"
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
      provider: args.provider,
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
