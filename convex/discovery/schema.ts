import { defineTable } from "convex/server"
import { v } from "convex/values"
import { location } from "../../contracts/discovery/validators"
export const lane = v.union(v.literal("text"), v.literal("file"))
export const discoverySources = defineTable({
  organizationId: v.string(),
  key: v.string(),
  lane,
  generation: v.number(),
  pending: v.boolean(),
  nextAt: v.number(),
  attempts: v.number(),
  resourceKey: v.optional(v.string()),
  authorityKey: v.optional(v.string()),
  revision: v.optional(v.string()),
  textHash: v.optional(v.string()),
  fileKey: v.optional(v.string()),
  coverage: v.optional(v.string()),
  parts: v.optional(v.number()),
  cascadeHash: v.optional(v.string()),
  cascade: v.optional(v.boolean()),
  cascadePhase: v.optional(v.number()),
  cascadeCursor: v.optional(v.union(v.string(), v.null())),
  error: v.optional(v.string()),
  indexedAt: v.optional(v.number()),
  raisedAt: v.number(),
})
  .index("by_key", ["key"])
  .index("by_organizationId_and_lane_and_pending_and_nextAt", [
    "organizationId",
    "lane",
    "pending",
    "nextAt",
  ])
  .index("by_organizationId_and_pending", ["organizationId", "pending"])
  .index("by_organizationId_and_resourceKey", ["organizationId", "resourceKey"])
  .index("by_organizationId_and_authorityKey", [
    "organizationId",
    "authorityKey",
  ])
export const discoveryQueues = defineTable({
  organizationId: v.string(),
  lane,
  lease: v.number(),
  nextAt: v.number(),
})
  .index("by_organizationId_and_lane", ["organizationId", "lane"])
  .index("by_nextAt", ["nextAt"])
export const discoveryPassages = defineTable({
  organizationId: v.string(),
  key: v.string(),
  part: v.number(),
  text: v.string(),
  location,
})
  .index("by_key_and_part", ["key", "part"])
  .index("by_organizationId", ["organizationId"])
export const discoveryScans = defineTable({
  name: v.string(),
  table: v.number(),
  cursor: v.union(v.string(), v.null()),
  nextAt: v.number(),
  completedAt: v.optional(v.number()),
  rebuilding: v.optional(v.boolean()),
}).index("by_name", ["name"])
