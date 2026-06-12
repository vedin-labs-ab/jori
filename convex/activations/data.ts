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

export async function startMessageRun(
  ctx: MutationCtx,
  args: {
    activation: Doc<"activations"> | null
    integration: Doc<"integrations">
    messageId: Id<"messages">
    messageType: string
    messageExternalId: string
    conversationId: string
    createdBy: string | undefined
    now: number
  }
) {
  const runId = await ctx.db.insert("runs", {
    tenantId: args.integration.tenantId,
    reason: {
      type: "message",
      messageId: args.messageId,
    },
    data: {
      message: {
        type: args.messageType,
        externalId: args.messageExternalId,
      },
    },
    createdBy: args.createdBy,
    createdAt: args.now,
  })

  const activationId =
    args.activation === null
      ? await ctx.db.insert("activations", {
          tenantId: args.integration.tenantId,
          runId,
          integrationId: args.integration._id,
          conversationId: args.conversationId,
          createdBy: args.createdBy,
          createdAt: args.now,
        })
      : args.activation._id

  return {
    status: "started" as const,
    messageId: args.messageId,
    runId,
    activationId,
  }
}
