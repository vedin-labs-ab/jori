import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { moveUsageBucket } from "../../usage/record"
import { type Gate } from "../../visibility/sight"

const batchSize = 100

/** Filing organizes a chat without sharing its private conversation. */
export function conversationGate(conversation: Doc<"conversations">): Gate {
  return {
    organizationId: conversation.organizationId,
    ownerId: conversation.createdBy,
    visibility: { mode: "private" },
    folderId: conversation.folderId,
  }
}

export async function fileConversation(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  folderId: Id<"folders"> | undefined,
  defer = false
) {
  await ctx.db.patch(conversation._id, { folderId })
  const args = { conversationId: conversation._id, folderId }

  if (defer) {
    await ctx.scheduler.runAfter(
      0,
      internal.conversations.filing.move.reconcile,
      args
    )
  } else {
    await reconcileConversation(ctx, args)
  }
}

const filingArgs = {
  conversationId: v.id("conversations"),
  folderId: v.optional(v.id("folders")),
}

type FilingArgs = {
  conversationId: Id<"conversations">
  folderId?: Id<"folders">
}

export const reconcile = internalMutation({
  args: filingArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await reconcileConversation(ctx, args)
    return null
  },
})

/** Small chats settle in the move transaction. Larger histories continue
 *  in batches, and each pass checks that a later move has not superseded it.
 *  Metering reads the chat's current folder while its history catches up. */
export async function reconcileConversation(
  ctx: MutationCtx,
  args: FilingArgs
) {
  const conversation = await ctx.db.get(args.conversationId)

  if (conversation === null || conversation.folderId !== args.folderId) {
    return
  }

  // The folder's deletion sweep owns its destination after it disappears.
  if (
    args.folderId !== undefined &&
    (await ctx.db.get(args.folderId)) === null
  ) {
    return
  }

  const folderId = args.folderId
  const runs = await outsideFolder(ctx, "runs", args.conversationId, folderId)

  for (const run of runs) {
    await ctx.db.patch(run._id, { folderId })
  }

  const usage = await moveConversationUsage(ctx, args.conversationId, folderId)

  if (runs.length === batchSize || usage === batchSize) {
    await ctx.scheduler.runAfter(
      0,
      internal.conversations.filing.move.reconcile,
      args
    )
  }
}

export async function moveConversationUsage(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  folderId: Id<"folders"> | undefined
) {
  const rows = await outsideFolder(ctx, "usage", conversationId, folderId)

  for (const row of rows) {
    await moveUsageBucket(ctx, row as Doc<"usage">, folderId)
  }

  return rows.length
}

/** Moving rows removes them from these indexed ranges, so continuation
 *  needs no cursor and never revisits rows already at the destination. */
async function outsideFolder(
  ctx: MutationCtx,
  table: "runs" | "usage",
  conversationId: Id<"conversations">,
  folderId: Id<"folders"> | undefined
) {
  const before = await ctx.db
    .query(table)
    .withIndex("by_conversation_and_folder", (index) =>
      index.eq("conversationId", conversationId).lt("folderId", folderId)
    )
    .take(batchSize)
  if (before.length === batchSize) {
    return before
  }

  const after = await ctx.db
    .query(table)
    .withIndex("by_conversation_and_folder", (index) =>
      index.eq("conversationId", conversationId).gt("folderId", folderId)
    )
    .take(batchSize - before.length)

  return [...before, ...after]
}
