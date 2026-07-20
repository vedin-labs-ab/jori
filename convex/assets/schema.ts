import { defineTable } from "convex/server"
import { v } from "convex/values"

// One recorded sandbox output file; shared by the record mutation args.
export const assetFields = {
  organizationId: v.string(),
  runId: v.id("runs"),
  storageId: v.id("_storage"),
  name: v.string(),
  mimeType: v.string(),
  size: v.number(),
  description: v.optional(v.string()),
}

export const assets = defineTable({
  ...assetFields,
  createdAt: v.number(),
})
  .index("by_run", ["runId"])
  .index("by_organization_and_created_at", ["organizationId", "createdAt"])
