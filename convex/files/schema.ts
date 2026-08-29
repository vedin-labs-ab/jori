import { defineTable } from "convex/server"
import { v } from "convex/values"

export const fileScopes = v.union(
  v.literal("organization"),
  v.literal("personal")
)

// One stored workspace file; shared by the record mutation args. Files are
// organization-visible by default; a personal file is visible to its owner
// only. A runId records provenance when an agent run produced the file.
export const fileFields = {
  organizationId: v.string(),
  scope: fileScopes,
  ownerId: v.optional(v.id("persons")),
  runId: v.optional(v.id("runs")),
  storageId: v.id("_storage"),
  name: v.string(),
  mimeType: v.string(),
  size: v.number(),
  description: v.optional(v.string()),
  /** Filing only — folders carry no access semantics. */
  folderId: v.optional(v.id("folders")),
}

export const files = defineTable({
  ...fileFields,
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_run", ["runId"])
  .index("by_organization_and_created_at", ["organizationId", "createdAt"])
  .index("by_folder", ["folderId"])
