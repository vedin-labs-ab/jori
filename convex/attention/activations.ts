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

export async function startSourceItemExecution(
  ctx: MutationCtx,
  args: {
    activation: Doc<"activations"> | null
    integration: Doc<"integrations">
    sourceItemId: Id<"sourceItems">
    sourceKind: string
    sourceExternalId: string
    conversationId: string
    now: number
  }
) {
  const triggerId = await ctx.db.insert("triggers", {
    tenantId: args.integration.tenantId,
    sourceItemId: args.sourceItemId,
    type: "source_item",
    data: {
      source: {
        kind: args.sourceKind,
        externalId: args.sourceExternalId,
      },
    },
    createdAt: args.now,
  })

  const executionId = await ctx.db.insert("executions", {
    tenantId: args.integration.tenantId,
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
    sourceItemId: args.sourceItemId,
    triggerId,
    executionId,
    activationId,
  }
}
