import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"

export async function findConversationActivation(
  ctx: MutationCtx,
  args: {
    tenantId: string
    integrationId: Id<"integrations">
    conversationId: string | undefined
  }
) {
  if (args.conversationId === undefined) {
    return null
  }

  const conversationId = args.conversationId

  return await ctx.db
    .query("activations")
    .withIndex("by_conversation", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("integrationId", args.integrationId)
        .eq("conversationId", conversationId)
    )
    .first()
}

export async function startMessageExecution(
  ctx: MutationCtx,
  args: {
    activation: Doc<"activations"> | null
    integration: Doc<"integrations">
    messageId: Id<"messages">
    messageType: string
    messageExternalId: string
    conversationId: string
    now: number
  }
) {
  const triggerId = await ctx.db.insert("triggers", {
    tenantId: args.integration.tenantId,
    messageId: args.messageId,
    type: "message",
    data: {
      message: {
        type: args.messageType,
        externalId: args.messageExternalId,
      },
    },
    createdAt: args.now,
  })

  const executionId = await ctx.db.insert("executions", {
    tenantId: args.integration.tenantId,
    triggerId,
    status: "queued",
    createdAt: args.now,
  })

  const activationId =
    args.activation === null
      ? await ctx.db.insert("activations", {
          tenantId: args.integration.tenantId,
          triggerId,
          integrationId: args.integration._id,
          conversationId: args.conversationId,
          executionId,
          createdAt: args.now,
        })
      : args.activation._id

  if (args.activation !== null) {
    await ctx.db.patch(args.activation._id, { executionId })
  }

  return {
    status: "started" as const,
    messageId: args.messageId,
    triggerId,
    executionId,
    activationId,
  }
}
