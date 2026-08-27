import { defineTable } from "convex/server"
import { v } from "convex/values"
import { shareFields } from "../materials/shares"

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
}

export const files = defineTable({
  ...fileFields,
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_run", ["runId"])
  .index("by_organization_and_created_at", ["organizationId", "createdAt"])

/** Each share is an independent read-only grant with its own secret and
 *  expiry; a file can have several live at once. */
export const fileShares = defineTable({
  ...shareFields,
  fileId: v.id("files"),
})
  .index("by_file_and_expires_at", ["fileId", "expiresAt"])
  .index("by_file_and_secret", ["fileId", "secret"])
