import { defineTable } from "convex/server"
import { v } from "convex/values"

/** One organization total and one direct bucket per folder, including unfiled. */
export const fileUsage = defineTable({
  organizationId: v.string(),
  key: v.string(),
  folderId: v.optional(v.id("folders")),
  bytes: v.number(),
  count: v.number(),
  overCapacityAt: v.optional(v.number()),
  overCapacityNoticeId: v.optional(v.id("emailSubmissions")),
  overCapacityRetryAt: v.optional(v.number()),
})
  .index("by_organization_and_key", ["organizationId", "key"])
  .index("by_key", ["key"])
  .index("by_overCapacityAt", ["overCapacityAt"])
