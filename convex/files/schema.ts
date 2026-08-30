import { defineTable } from "convex/server"
import { v } from "convex/values"
import { visibilityValidator } from "../visibility/schema"

export const fileScopes = v.union(
  v.literal("organization"),
  v.literal("personal")
)

// One stored workspace file; shared by the record mutation args. Files are
// organization-visible by default; visibility narrows or widens that per
// file. A runId records provenance when an agent run produced the file.
export const fileFields = {
  organizationId: v.string(),
  /** Who may see the file; read via visibility/schema.readVisibility. */
  visibility: v.optional(visibilityValidator),
  /** Legacy binary scope, mapped and cleared by visibility/migrate.ts. */
  scope: v.optional(fileScopes),
  ownerId: v.optional(v.id("persons")),
  runId: v.optional(v.id("runs")),
  storageId: v.id("_storage"),
  name: v.string(),
  mimeType: v.string(),
  size: v.number(),
  description: v.optional(v.string()),
  /** Filing; ancestor folders also gate visibility (see visibility/sight). */
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
