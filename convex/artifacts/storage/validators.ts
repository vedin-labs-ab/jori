import { v } from "convex/values"

export const storedBlobValidator = v.object({
  id: v.string(),
  mimeType: v.string(),
  byteSize: v.number(),
  storageId: v.id("_storage"),
})

export const treeValidator = v.object({
  id: v.string(),
  entries: v.array(
    v.object({
      name: v.string(),
      mode: v.union(
        v.literal("directory"),
        v.literal("file"),
        v.literal("executable")
      ),
      id: v.string(),
    })
  ),
})

export const assetValidator = v.object({
  path: v.string(),
  mimeType: v.string(),
  byteSize: v.number(),
  storageId: v.id("_storage"),
})

export const capabilityInputValidator = v.object({
  tool: v.string(),
  integrationId: v.optional(v.id("integrations")),
  versionPinned: v.optional(v.boolean()),
})
