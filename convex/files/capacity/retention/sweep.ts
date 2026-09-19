import { v } from "convex/values"
import { storage } from "../../../../contracts/billing"
import { internal } from "../../../_generated/api"
import { type Doc } from "../../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../../_generated/server"
import { getAccount } from "../../../billing/account"
import { isWorkspaceDeleting } from "../../../retention/access"
import { purgeFile } from "../../records"
import { capacityBytes, clearCapacityNotice, usageBucket } from "../meter"
import { ensureNotice } from "./notice"

export const run = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("fileUsage")
      .withIndex("by_key", (q) => q.eq("key", "total"))
      .paginate({ cursor: args.cursor ?? null, numItems: 50 })
    for (const row of page.page) {
      await ctx.scheduler.runAfter(
        0,
        internal.files.capacity.retention.sweep.workspace,
        { organizationId: row.organizationId }
      )
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.files.capacity.retention.sweep.run,
        { cursor: page.continueCursor }
      )
    }
    return null
  },
})

/** Every batch reads the current account and counter in the same transaction
 * as deletion. Capacity restoration or file changes conflict and retry safely. */
export const workspace = internalMutation({
  args: {
    organizationId: v.string(),
    cursor: v.optional(v.string()),
    noticeId: v.optional(v.id("emailSubmissions")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await usageBucket(ctx, args.organizationId)
    if (
      row === null ||
      (args.noticeId !== undefined &&
        row.overCapacityNoticeId !== args.noticeId)
    ) {
      return null
    }
    const account = await getAccount(ctx, args.organizationId)
    const extraGb = account?.storage?.extraGb ?? 0
    const limit = await capacityBytes(ctx, args.organizationId)
    if (
      !Number.isSafeInteger(row.bytes) ||
      row.bytes < 0 ||
      !Number.isSafeInteger(extraGb) ||
      extraGb < 0 ||
      !Number.isSafeInteger(limit) ||
      limit <= 0
    ) {
      return null
    }
    if (
      account?.state.kind !== "active" ||
      account.refundHold !== undefined ||
      row.bytes <= limit ||
      (await isWorkspaceDeleting(ctx, args.organizationId))
    ) {
      await clearCapacityNotice(ctx, row)
      return null
    }
    const noticeAt = await ensureNotice(ctx, row)
    if (
      noticeAt === null ||
      Date.now() < noticeAt + storage.graceMs ||
      row.overCapacityNoticeId === undefined
    ) {
      return null
    }
    await deleteBatch(ctx, row, limit, args.cursor)
    return null
  },
})

async function deleteBatch(
  ctx: MutationCtx,
  row: Doc<"fileUsage">,
  limit: number,
  cursor?: string
) {
  const page = await ctx.db
    .query("files")
    .withIndex("by_organization_and_created_at", (q) =>
      q.eq("organizationId", row.organizationId)
    )
    .order("desc")
    .paginate({ cursor: cursor ?? null, numItems: 20 })
  // A partial counter backfill must never lead to destructive guesses.
  if (
    page.page.some(
      (file) =>
        !file.metered || !Number.isSafeInteger(file.size) || file.size < 0
    )
  ) {
    return null
  }
  let bytes = row.bytes
  for (const file of page.page) {
    if (bytes <= limit) {
      break
    }
    if (file.size === 0) {
      continue
    }
    await purgeFile(ctx, file)
    bytes -= file.size
  }
  if (bytes <= limit) {
    await clearCapacityNotice(ctx, row)
  } else if (!page.isDone) {
    await ctx.scheduler.runAfter(
      0,
      internal.files.capacity.retention.sweep.workspace,
      {
        organizationId: row.organizationId,
        cursor: page.continueCursor,
        noticeId: row.overCapacityNoticeId,
      }
    )
  }
}
