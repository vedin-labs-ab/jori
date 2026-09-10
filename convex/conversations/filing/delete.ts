import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { stopRun } from "../../runs/tree"
import { moveConversationUsage } from "./move"

const batchSize = 100

/** Folder deletion may remove a chat's content, but its accounting stays.
 *  Stop its work and move every run before purging messages and sessions. */
export async function purgeConversation(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  folderId: Id<"folders"> | undefined
) {
  if (conversation.debounce !== undefined) {
    await ctx.scheduler.cancel(conversation.debounce.functionId)
  }

  await ctx.db.delete(conversation._id)
  // The folder sweep budgets one row per chat; its contents run separately.
  await ctx.scheduler.runAfter(0, internal.conversations.filing.delete.sweep, {
    conversationId: conversation._id,
    organizationId: conversation.organizationId,
    externalId: conversation.externalId,
    folderId,
    runsCursor: null,
  })
}

const purgeArgs = {
  conversationId: v.id("conversations"),
  organizationId: v.string(),
  externalId: v.string(),
  folderId: v.optional(v.id("folders")),
  /** Undefined means every run was already processed. */
  runsCursor: v.optional(v.union(v.string(), v.null())),
}

type PurgeArgs = {
  conversationId: Id<"conversations">
  organizationId: string
  externalId: string
  folderId?: Id<"folders">
  runsCursor?: string | null
}

export const sweep = internalMutation({
  args: purgeArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await purgeConversationBatch(ctx, args)
    return null
  },
})

export async function purgeConversationBatch(
  ctx: MutationCtx,
  args: PurgeArgs
) {
  const folderId =
    args.folderId !== undefined && (await ctx.db.get(args.folderId)) !== null
      ? args.folderId
      : undefined

  if (args.runsCursor !== undefined) {
    const runs = await ctx.db
      .query("runs")
      .withIndex("by_conversation_and_created_at", (index) =>
        index.eq("conversationId", args.conversationId)
      )
      .paginate({ cursor: args.runsCursor, numItems: batchSize })

    for (const run of runs.page) {
      await ctx.db.patch(run._id, { folderId })
      await stopRun(ctx, { ...run, folderId })
    }

    if (!runs.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.conversations.filing.delete.sweep,
        {
          ...args,
          folderId,
          runsCursor: runs.continueCursor,
        }
      )
      return
    }
  }

  await purgeContents(ctx, { ...args, folderId, runsCursor: undefined })
}

async function purgeContents(ctx: MutationCtx, args: PurgeArgs) {
  const folderId = args.folderId
  const usage = await moveConversationUsage(ctx, args.conversationId, folderId)
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (index) =>
      index
        .eq("organizationId", args.organizationId)
        .eq("integrationId", undefined)
        .eq("conversationId", args.externalId)
    )
    .take(batchSize)
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_conversation", (index) =>
      index.eq("conversationId", args.conversationId)
    )
    .take(batchSize)

  for (const row of [...messages, ...sessions]) {
    await ctx.db.delete(row._id)
  }

  if (
    usage === batchSize ||
    messages.length === batchSize ||
    sessions.length === batchSize
  ) {
    await ctx.scheduler.runAfter(
      0,
      internal.conversations.filing.delete.sweep,
      {
        ...args,
        folderId,
        runsCursor: undefined,
      }
    )
  }
}
