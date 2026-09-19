import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { exportSight } from "./access"
import { childPage, fileUrl, resourcePage } from "./data"
import { childArgs, resourceArgs } from "./validators"

export const resources = query({
  args: resourceArgs,
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    return resourcePage(
      ctx,
      args.organizationId,
      args.section,
      args.cursor,
      await exportSight(ctx, args.organizationId)
    )
  },
})

export const children = query({
  args: childArgs,
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    return childPage(ctx, args, await exportSight(ctx, args.organizationId))
  },
})

export const file = query({
  args: {
    organizationId: v.string(),
    fileId: v.id("files"),
    epoch: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)
    return fileUrl(
      ctx,
      args.organizationId,
      args.fileId,
      await exportSight(ctx, args.organizationId)
    )
  },
})
