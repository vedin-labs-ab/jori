import { v } from "convex/values"
import { storage } from "../../../../contracts/billing"
import { type Id } from "../../../_generated/dataModel"
import { type QueryCtx, query } from "../../../_generated/server"
import { requireOrganizationAccess } from "../../../access"
import { getAccount } from "../../../billing/account"
import { resolveConsolePerson } from "../../../persons/account"
import { requireRetentionAccess } from "../../../retention/authorization"
import { boundedNumber } from "../../../shared/input"
import { createSight, type Sight } from "../../../visibility/sight"
import { capacityBytes, usageBucket } from "../meter"

/** Reloading a larger bounded prefix keeps the preview consistent with current
 * usage instead of trusting a byte total carried in a client's page cursor. */
export const overview = query({
  args: { organizationId: v.string(), limit: v.optional(v.number()) },
  returns: v.union(
    v.null(),
    v.object({
      deadline: v.optional(v.number()),
      excessBytes: v.number(),
      files: v.array(
        v.object({
          fileId: v.id("files"),
          name: v.string(),
          size: v.number(),
          createdAt: v.number(),
        })
      ),
      hiddenCount: v.number(),
      hiddenBytes: v.number(),
      more: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const member = await requireRetentionAccess(
      ctx,
      args.organizationId,
      identity
    )
    if (!member.role.split(",").includes("owner")) {
      return null
    }
    const personId = await resolveConsolePerson(
      ctx,
      args.organizationId,
      identity
    )
    const sight = createSight(ctx, {
      organizationId: args.organizationId,
      personId,
    })
    const [row, capacity, account] = await Promise.all([
      usageBucket(ctx, args.organizationId),
      capacityBytes(ctx, args.organizationId),
      getAccount(ctx, args.organizationId),
    ])
    const excessBytes = Math.max(0, (row?.bytes ?? 0) - capacity)
    const deadline =
      excessBytes > 0 &&
      account?.state.kind === "active" &&
      account.refundHold === undefined &&
      row?.overCapacityAt !== undefined
        ? row.overCapacityAt + storage.graceMs
        : undefined
    const active =
      account?.state.kind === "active" && account.refundHold === undefined
    return {
      deadline,
      excessBytes,
      ...(await preview(
        ctx,
        sight,
        active ? excessBytes : 0,
        boundedNumber(args.limit, 50, 1, 500)
      )),
    }
  },
})

async function preview(
  ctx: QueryCtx,
  sight: Sight,
  excessBytes: number,
  limit: number
) {
  const result = {
    files: [] as {
      fileId: Id<"files">
      name: string
      size: number
      createdAt: number
    }[],
    hiddenCount: 0,
    hiddenBytes: 0,
    more: false,
  }
  if (excessBytes <= 0) {
    return result
  }
  const files = await ctx.db
    .query("files")
    .withIndex("by_organization_and_created_at", (q) =>
      q.eq("organizationId", sight.organizationId)
    )
    .order("desc")
    .take(limit)
  let reclaimed = 0
  for (const file of files) {
    if (reclaimed >= excessBytes) {
      break
    }
    if (file.size === 0) {
      continue
    }
    reclaimed += file.size
    if (await sight.canSee(file)) {
      result.files.push({
        fileId: file._id,
        name: file.name,
        size: file.size,
        createdAt: file.createdAt,
      })
    } else {
      result.hiddenCount++
      result.hiddenBytes += file.size
    }
  }
  result.more = reclaimed < excessBytes && files.length === limit
  return result
}
