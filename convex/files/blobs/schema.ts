import { defineTable } from "convex/server"
import { v } from "convex/values"

// Survives workspace deletion until the upload URL has expired and cleanup
// has removed any bytes that arrived after the workspace closed.
export const uploads = defineTable({
  key: v.string(),
  createdAt: v.number(),
})
  .index("by_key", ["key"])
  .index("by_createdAt", ["createdAt"])
