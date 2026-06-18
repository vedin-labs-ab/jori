import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { createMessageRunSnapshot } from "../runs/snapshot"
import { createSlackRunStatus } from "../runtime/slack"

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
    message: Doc<"messages">
    conversationId: string
    createdBy: string | undefined
    now: number
  }
) {
  const kind = args.activation === null ? "mention" : "reply"
  const runId = await ctx.db.insert("runs", {
    tenantId: args.integration.tenantId,
    reason: {
      type: "message",
      messageId: args.message._id,
      kind,
    },
    ...createMessageRunSnapshot({
      integration: args.integration,
      kind,
      message: args.message,
    }),
    createdBy: args.createdBy,
    createdAt: args.now,
  })

  await createSlackRunStatus(ctx, {
    integration: args.integration,
    message: args.message,
    runId,
    now: args.now,
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
    messageId: args.message._id,
    runId,
    activationId,
  }
}
