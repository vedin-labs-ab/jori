import { defineTable } from "convex/server"
import { v } from "convex/values"

export const artifactAccess = v.union(
  v.literal("personal"),
  v.literal("organization")
)

export const artifactMode = v.union(
  v.literal("directory"),
  v.literal("file"),
  v.literal("executable"),
  v.literal("symlink")
)

export const artifactHashAlgorithm = v.union(
  v.literal("sha1"),
  v.literal("sha256")
)

export const artifactStateScope = v.union(
  v.literal("personal"),
  v.literal("shared")
)

export const artifactContractStateEntry = v.object({
  name: v.string(),
  key: v.string(),
  scope: artifactStateScope,
  description: v.optional(v.string()),
  schemaName: v.string(),
  schemaVersion: v.number(),
  schemaHash: v.string(),
  schema: v.any(),
})

export const artifactContract = v.object({
  version: v.number(),
  state: v.array(artifactContractStateEntry),
})

export const artifacts = defineTable({
  tenantId: v.string(),
  ownerId: v.string(),
  title: v.string(),
  access: artifactAccess,
  contract: v.optional(artifactContract),
  versionId: v.optional(v.id("artifactVersions")),
  createdAt: v.number(),
  updatedAt: v.number(),
  archivedAt: v.optional(v.number()),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_and_updated_at", ["tenantId", "updatedAt"])
  .index("by_tenant_and_owner", ["tenantId", "ownerId"])

export const artifactVersions = defineTable({
  tenantId: v.string(),
  artifactId: v.id("artifacts"),
  parentVersionId: v.optional(v.id("artifactVersions")),
  treeId: v.string(),
  entrypoint: v.string(),
  sdk: v.string(),
  message: v.optional(v.string()),
  createdBy: v.string(),
  createdAt: v.number(),
})
  .index("by_artifact", ["artifactId"])
  .index("by_tenant_and_artifact", ["tenantId", "artifactId"])
  .index("by_tree", ["treeId"])

export const artifactTrees = defineTable({
  id: v.string(),
  algorithm: artifactHashAlgorithm,
  createdAt: v.number(),
}).index("by_object_id", ["id"])

export const artifactEntries = defineTable({
  treeId: v.string(),
  name: v.string(),
  mode: artifactMode,
  id: v.string(),
})
  .index("by_tree", ["treeId"])
  .index("by_entry", ["id"])
  .index("by_tree_and_name", ["treeId", "name"])

export const artifactBlobs = defineTable({
  id: v.string(),
  algorithm: artifactHashAlgorithm,
  mimeType: v.string(),
  byteSize: v.number(),
  storageId: v.id("_storage"),
  createdAt: v.number(),
}).index("by_object_id", ["id"])

export const artifactTools = defineTable({
  tenantId: v.string(),
  artifactId: v.id("artifacts"),
  versionId: v.optional(v.id("artifactVersions")),
  tool: v.string(),
  integrationId: v.optional(v.id("integrations")),
  approvedBy: v.string(),
  approvedAt: v.number(),
  revokedAt: v.optional(v.number()),
})
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_and_tool", ["artifactId", "tool"])

export const artifactSessions = defineTable({
  tenantId: v.string(),
  artifactId: v.id("artifacts"),
  versionId: v.id("artifactVersions"),
  userId: v.string(),
  access: artifactAccess,
  status: v.union(v.literal("active"), v.literal("ended")),
  tokenSecret: v.string(),
  tokenExpiresAt: v.number(),
  createdAt: v.number(),
  seenAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_artifact", ["artifactId"])
  .index("by_user_and_artifact", ["userId", "artifactId"])

export const artifactAssets = defineTable({
  tenantId: v.string(),
  artifactId: v.id("artifacts"),
  versionId: v.id("artifactVersions"),
  path: v.string(),
  mimeType: v.string(),
  byteSize: v.number(),
  storageId: v.id("_storage"),
  createdAt: v.number(),
})
  .index("by_version", ["versionId"])
  .index("by_version_and_path", ["versionId", "path"])

export const artifactState = defineTable({
  tenantId: v.string(),
  artifactId: v.id("artifacts"),
  userId: v.optional(v.string()),
  scope: artifactStateScope,
  contractName: v.optional(v.string()),
  schemaName: v.optional(v.string()),
  schemaVersion: v.optional(v.number()),
  schemaHash: v.optional(v.string()),
  key: v.string(),
  value: v.any(),
  version: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_artifact_and_scope_and_user_and_key", [
    "artifactId",
    "scope",
    "userId",
    "key",
  ])
  .index("by_artifact_and_scope_and_key", ["artifactId", "scope", "key"])

export const artifactCaches = defineTable({
  tenantId: v.string(),
  artifactId: v.id("artifacts"),
  versionId: v.id("artifactVersions"),
  userId: v.string(),
  surface: v.string(),
  tool: v.string(),
  integrationId: v.optional(v.id("integrations")),
  cacheKey: v.string(),
  value: v.any(),
  expiresAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_and_key", ["artifactId", "cacheKey"])
  .index("by_artifact_and_user_and_surface", [
    "artifactId",
    "userId",
    "surface",
  ])
  .index("by_expires_at", ["expiresAt"])
