import { defineTable } from "convex/server"
import { v } from "convex/values"
import { visibilityValidator } from "../visibility/schema"

// One stored workspace file; shared by the record mutation args. Files are
// organization-visible by default; visibility narrows or widens that per
// file. A runId records provenance when an agent run produced the file.
export const fileFields = {
  organizationId: v.string(),
  /** Who may see the file (see visibility/sight). */
  visibility: visibilityValidator,
  ownerId: v.optional(v.id("persons")),
  runId: v.optional(v.id("runs")),
  /** The file's bytes in blob storage (see files/blobs). */
  blobKey: v.string(),
  name: v.string(),
  mimeType: v.string(),
  size: v.number(),
  /** Filing; ancestor folders also gate visibility (see visibility/sight). */
  folderId: v.optional(v.id("folders")),
}

export const files = defineTable({
  ...fileFields,
  metered: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_blobKey", ["blobKey"])
  .index("by_run", ["runId"])
  .index("by_organization_and_created_at", ["organizationId", "createdAt"])
  .index("by_folder", ["folderId"])
  .index("by_organization_and_folder", ["organizationId", "folderId"])
