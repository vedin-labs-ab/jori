import { v } from "convex/values"

export const resourceArgs = {
  organizationId: v.string(),
  section: v.union(
    v.literal("folders"),
    v.literal("jobs"),
    v.literal("files"),
    v.literal("collections"),
    v.literal("conversations")
  ),
  cursor: v.union(v.string(), v.null()),
}

export const childArgs = {
  organizationId: v.string(),
  section: v.union(v.literal("documents"), v.literal("messages")),
  parentId: v.union(v.id("collections"), v.id("conversations")),
  cursor: v.union(v.string(), v.null()),
}
