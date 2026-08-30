import { defineTable } from "convex/server"
import { v } from "convex/values"
import { scopeValidator } from "../shared/audience"

// One storage core for schema-validated, versioned JSON documents. A table
// is a collection of many documents (rows) authored as typed columns; a
// store is a collection with exactly one document authored as JSON Schema.
// Both compile to a JSON Schema, so one validator covers both.

/** One typed column; mirrors contracts/tables/columns.ts TableColumn. */
const tableColumn = v.object({
  key: v.string(),
  name: v.string(),
  type: v.union(
    v.literal("boolean"),
    v.literal("float"),
    v.literal("integer"),
    v.literal("string")
  ),
  required: v.optional(v.boolean()),
})

const collectionFields = {
  organizationId: v.string(),
  scope: scopeValidator,
  ownerId: v.optional(v.id("persons")),
  /** Filing only — folders carry no access semantics. */
  folderId: v.optional(v.id("folders")),
  name: v.string(),
  description: v.optional(v.string()),
  /** Content hash of the compiled JSON Schema. */
  schemaHash: v.string(),
  /** Denormalized document count, kept in step by the document write
   *  chokepoint (convex/collections/documents.ts). Read as `?? 0`. */
  documentCount: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
  archivedAt: v.optional(v.number()),
}

/** A named collection of documents, carrying its kind-native authoring
 *  schema: columns for tables, a JSON Schema for stores. */
export const collections = defineTable(
  v.union(
    v.object({
      ...collectionFields,
      kind: v.literal("table"),
      columns: v.array(tableColumn),
    }),
    v.object({
      ...collectionFields,
      kind: v.literal("store"),
      schema: v.any(),
    })
  )
)
  .index("by_organization_and_kind_and_updated_at", [
    "organizationId",
    "kind",
    "updatedAt",
  ])
  .index("by_folder", ["folderId"])

/** One versioned document: a table's row or a store's single value. Rows
 *  sort by `order` (see collections/order.ts); every creating path stamps
 *  it, and it is optional only so pre-order documents still validate. */
export const documents = defineTable({
  collectionId: v.id("collections"),
  value: v.any(),
  version: v.number(),
  order: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_collection", ["collectionId"])
  .index("by_collection_and_order", ["collectionId", "order"])

/** Each share is an independent read-only grant with its own secret and
 *  expiry; a target can have several live at once. The target is
 *  polymorphic: collections carry their kind, files stay their own domain. */
export const shares = defineTable({
  organizationId: v.string(),
  createdBy: v.id("persons"),
  secret: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
  targetKind: v.union(
    v.literal("table"),
    v.literal("store"),
    v.literal("file")
  ),
  targetId: v.union(v.id("collections"), v.id("files")),
})
  .index("by_target_and_expires_at", ["targetKind", "targetId", "expiresAt"])
  .index("by_target_and_secret", ["targetKind", "targetId", "secret"])

/** How a document changes; mirrors contracts/collections/write.ts. */
export const documentWrite = v.union(
  v.object({
    type: v.literal("replace"),
    value: v.any(),
  }),
  v.object({
    type: v.literal("merge"),
    patch: v.any(),
  }),
  v.object({
    type: v.literal("claim"),
    path: v.array(v.string()),
    value: v.any(),
  })
)
