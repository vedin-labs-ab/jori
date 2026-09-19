import { plan, storage } from "../../../contracts/billing"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../../_generated/server"
import { getAccount } from "../../billing/account"

export async function usageBucket(
  ctx: QueryCtx,
  organizationId: string,
  key = "total"
) {
  return await ctx.db
    .query("fileUsage")
    .withIndex("by_organization_and_key", (q) =>
      q.eq("organizationId", organizationId).eq("key", key)
    )
    .unique()
}

export async function capacityBytes(ctx: QueryCtx, organizationId: string) {
  const account = await getAccount(ctx, organizationId)
  return (
    (plan.storageGb + (account?.storage?.extraGb ?? 0)) * storage.bytesPerGb
  )
}

/** The organization counter makes concurrent file writes share one quota check. */
export async function changeUsage(
  ctx: MutationCtx,
  args: {
    organizationId: string
    folderId?: Id<"folders">
    bytes: number
    count: number
    enforce?: boolean
  }
) {
  if (
    !Number.isSafeInteger(args.bytes) ||
    !Number.isSafeInteger(args.count) ||
    (args.count > 0 && args.bytes < 0)
  ) {
    throw new Error("File size must be a whole number of bytes.")
  }
  const total = await usageBucket(ctx, args.organizationId)
  const bytes = (total?.bytes ?? 0) + args.bytes
  const limit = await capacityBytes(ctx, args.organizationId)
  if (args.enforce && args.bytes > 0 && bytes > limit) {
    throw new Error(
      "Storage is full. Delete files or add storage in Billing before uploading more."
    )
  }
  await updateBucket(ctx, args, "total", total)
  await updateBucket(ctx, args, args.folderId ?? "unfiled")
  if (total !== null && bytes <= limit) {
    await clearCapacityNotice(ctx, total)
  }
}

async function updateBucket(
  ctx: MutationCtx,
  args: {
    organizationId: string
    folderId?: Id<"folders">
    bytes: number
    count: number
  },
  key: string,
  existing?: Doc<"fileUsage"> | null
) {
  const row =
    existing === undefined
      ? await usageBucket(ctx, args.organizationId, key)
      : existing
  const bytes = (row?.bytes ?? 0) + args.bytes
  const count = (row?.count ?? 0) + args.count
  if (bytes < 0 || count < 0) {
    throw new Error("Storage totals need to be reconciled before this change.")
  }
  if (row !== null && key !== "total" && count === 0 && bytes === 0) {
    await ctx.db.delete(row._id)
  } else if (row === null) {
    await ctx.db.insert("fileUsage", {
      organizationId: args.organizationId,
      key,
      ...(key === "total" ? {} : { folderId: args.folderId }),
      bytes,
      count,
    })
  } else {
    await ctx.db.patch(row._id, { bytes, count })
  }
}

/** Existing files are incorporated once, transactionally with their next change. */
export async function meterFile(ctx: MutationCtx, file: Doc<"files">) {
  if (file.metered) {
    return
  }
  await changeUsage(ctx, { ...file, bytes: file.size, count: 1 })
  await ctx.db.patch(file._id, { metered: true })
}

export async function moveFile(
  ctx: MutationCtx,
  file: Doc<"files">,
  folderId: Id<"folders"> | undefined
) {
  await meterFile(ctx, file)
  if (file.folderId === folderId) {
    return
  }
  await updateBucket(
    ctx,
    { ...file, bytes: -file.size, count: -1 },
    file.folderId ?? "unfiled"
  )
  await updateBucket(
    ctx,
    { ...file, folderId, bytes: file.size, count: 1 },
    folderId ?? "unfiled"
  )
  await ctx.db.patch(file._id, { folderId })
}

export async function clearCapacityNotice(
  ctx: MutationCtx,
  row: Doc<"fileUsage">
) {
  if (
    row.overCapacityAt !== undefined ||
    row.overCapacityNoticeId !== undefined ||
    row.overCapacityRetryAt !== undefined
  ) {
    await ctx.db.patch(row._id, {
      overCapacityAt: undefined,
      overCapacityNoticeId: undefined,
      overCapacityRetryAt: undefined,
    })
  }
}
