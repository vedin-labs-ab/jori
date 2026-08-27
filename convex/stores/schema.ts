import { defineTable } from "convex/server"
import { v } from "convex/values"
import { shareFields } from "../materials/shares"
import { scopeValidator } from "../shared/audience"

/** A store: one named JSON document with a schema fixed at creation. The
 *  churning value lives in storeValues so metadata reads stay cheap. */
export const stores = defineTable({
  organizationId: v.string(),
  ownerId: v.id("persons"),
  scope: scopeValidator,
  name: v.string(),
  description: v.optional(v.string()),
  schema: v.any(),
  schemaHash: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  archivedAt: v.optional(v.number()),
}).index("by_organization_and_updated_at", ["organizationId", "updatedAt"])

/** The store's single versioned value, created on first write. */
export const storeValues = defineTable({
  organizationId: v.string(),
  storeId: v.id("stores"),
  value: v.any(),
  version: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_store", ["storeId"])

/** Each share is an independent read-only grant with its own secret and
 *  expiry; a store can have several live at once. */
export const storeShares = defineTable({
  ...shareFields,
  storeId: v.id("stores"),
})
  .index("by_store_and_expires_at", ["storeId", "expiresAt"])
  .index("by_store_and_secret", ["storeId", "secret"])

/** How a store value changes; mirrors contracts/stores/write.ts StoreWrite. */
export const storeWrite = v.union(
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
