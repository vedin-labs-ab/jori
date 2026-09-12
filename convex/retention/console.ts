import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { requireIdentity } from "../access"
import { requireOwner, requireRetentionAccess } from "./authorization"
import { findRetention } from "./data"
import { beginDeletion } from "./deletion"

export const status = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireRetentionAccess(
      ctx,
      args.organizationId,
      await requireIdentity(ctx)
    )
    const row = await findRetention(ctx, args.organizationId)
    if (!row) {
      return null
    }
    const {
      state,
      endedAt,
      deletesAt,
      noticeAt,
      startedAt,
      completedAt,
      blocked,
    } = row
    return {
      state,
      endedAt,
      deletesAt,
      noticeAt,
      startedAt,
      completedAt,
      blocked,
    }
  },
})

export const remove = mutation({
  args: { organizationId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.organizationId, await requireIdentity(ctx))
    await beginDeletion(ctx, args.organizationId)
    return null
  },
})
