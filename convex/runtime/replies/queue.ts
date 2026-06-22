import { v } from "convex/values"
import { type Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { replyAddress } from "../../messages/surface"
import { enqueueOperation } from "../outbox"

export const enqueueFinalReply = internalMutation({
  args: {
    content: v.string(),
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const message = await findRunMessage(ctx, args.runId)

    if (message === null || replyAddress(message) === null) {
      return null
    }

    return await queueReply(ctx, {
      kind: "final",
      messageId: message._id,
      runId: args.runId,
      tenantId: message.tenantId,
      text: args.content,
    })
  },
})

export async function queueReply(
  ctx: MutationCtx,
  args: {
    kind: "final"
    messageId: Id<"messages">
    runId: Id<"runs">
    tenantId: string
    text: string
  }
) {
  return await enqueueOperation(ctx, {
    tenantId: args.tenantId,
    key: `reply:${args.runId}:${args.kind}`,
    operation: {
      type: "reply.send",
      kind: args.kind,
      messageId: args.messageId,
      runId: args.runId,
      text: args.text,
    },
  })
}

async function findRunMessage(ctx: MutationCtx, runId: Id<"runs">) {
  const run = await ctx.db.get(runId)

  if (run === null || run.cause.type !== "message") {
    return null
  }

  const message = await ctx.db.get(run.cause.messageId)

  return message === null || message.tenantId !== run.tenantId ? null : message
}
