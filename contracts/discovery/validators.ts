import { v } from "convex/values"
export const candidate = v.object({
  key: v.string(),
  revision: v.string(),
  part: v.number(),
  score: v.number(),
})
export const location = v.object({
  kind: v.union(
    v.literal("resource"),
    v.literal("row"),
    v.literal("message"),
    v.literal("activity"),
    v.literal("passage")
  ),
  id: v.string(),
  label: v.optional(v.string()),
  field: v.optional(v.string()),
  page: v.optional(v.number()),
  seconds: v.optional(v.number()),
  sheet: v.optional(v.string()),
  cell: v.optional(v.string()),
  start: v.optional(v.number()),
  end: v.optional(v.number()),
})
