import { type PaginationOptions } from "convex/server"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryLikeCtx } from "../../shared/context"
import { scanPage } from "../../shared/pagination"
import { parseCursor } from "../../shared/pagination/cursor"
import { createSight, type Sight } from "../../visibility/sight"
import { conversationGate, conversationVisibility } from "../access"

/** The same sighted stream feeds chat navigation and reference pickers. */
export async function* visibleConsoleConversations(
  ctx: QueryLikeCtx,
  sight: Sight
) {
  const conversations = ctx.db
    .query("conversations")
    .withIndex("by_organization_and_surface_and_updated_at", (index) =>
      index.eq("organizationId", sight.organizationId).eq("surface", "console")
    )
    .order("desc")

  for await (const conversation of conversations) {
    if (await sight.canSee(conversationGate(conversation))) {
      yield conversation
    }
  }
}

export async function listConsoleConversations(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    paginationOpts: PaginationOptions
    personId: Id<"persons">
  }
) {
  return await scanPage(
    visibleConsoleConversations(ctx, createSight(ctx, args)),
    {
      offset: parseCursor(args.paginationOpts.cursor),
      numItems: args.paginationOpts.numItems,
      match: async () => ({}),
      row: async (conversation) => conversationView(conversation),
    }
  )
}

function conversationView(conversation: Doc<"conversations">) {
  return {
    id: conversation._id,
    title: conversation.title ?? "",
    folderId: conversation.folderId,
    visibility: conversationVisibility(conversation).mode,
    createdBy: conversation.createdBy,
    updatedAt: conversation.updatedAt ?? conversation._creationTime,
  }
}
