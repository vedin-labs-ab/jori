import { v } from "convex/values"
import { internalQuery } from "../_generated/server"
import { childPage, fileUrl, resourcePage } from "./data"
import { childArgs, resourceArgs } from "./validators"

// Operator-only controller export. No public visibility override exists.
export const resources = internalQuery({
  args: resourceArgs,
  handler: async (ctx, args) =>
    resourcePage(ctx, args.organizationId, args.section, args.cursor),
})
export const children = internalQuery({
  args: childArgs,
  handler: async (ctx, args) => childPage(ctx, args),
})
export const file = internalQuery({
  args: {
    organizationId: v.string(),
    fileId: v.id("files"),
    epoch: v.number(),
  },
  handler: async (ctx, args) => fileUrl(ctx, args.organizationId, args.fileId),
})
