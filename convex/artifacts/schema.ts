import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"

export const artifactAccess = v.union(
  v.literal("personal"),
  v.literal("organization")
)

/** What a session may do: members get the full tool surface, share-link
 *  viewers only read published assets and shared-scope state. */
export const artifactSessionGrant = v.union(
  v.literal("member"),
  v.literal("share")
)

export type ArtifactSessionGrant = Infer<typeof artifactSessionGrant>

const artifactMode = v.union(
  v.literal("directory"),
  v.literal("file"),
  v.literal("executable"),
  v.literal("symlink")
)

const artifactHashAlgorithm = v.union(v.literal("sha1"), v.literal("sha256"))

const artifactStateScope = v.union(v.literal("personal"), v.literal("shared"))

const artifactContractStateEntry = v.object({
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
  ownerId: v.id("persons"),
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
  createdBy: v.id("persons"),
  createdAt: v.number(),
})
  .index("by_artifact", ["artifactId"])
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
  approvedBy: v.id("persons"),
  approvedAt: v.number(),
  revokedAt: v.optional(v.number()),
})
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_and_tool", ["artifactId", "tool"])

export const artifactSessions = defineTable({
  tenantId: v.string(),
  artifactId: v.id("artifacts"),
  versionId: v.id("artifactVersions"),
  personId: v.id("persons"),
  access: artifactAccess,
  grant: artifactSessionGrant,
  status: v.union(v.literal("active"), v.literal("ended")),
  tokenSecret: v.string(),
  tokenExpiresAt: v.number(),
  createdAt: v.number(),
  seenAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_and_seen_at", ["artifactId", "seenAt"])

/** Each share is an independent grant with its own secret and expiry; an
 *  artifact can have several live at once. Revocation clears them all. */
export const artifactShares = defineTable({
  tenantId: v.string(),
  artifactId: v.id("artifacts"),
  createdBy: v.id("persons"),
  secret: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
}).index("by_artifact", ["artifactId"])

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
  personId: v.optional(v.id("persons")),
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
}).index("by_artifact_and_scope_and_person_and_key", [
  "artifactId",
  "scope",
  "personId",
  "key",
])

// Identifies one cache entry; shared by the cache read/write args and lookup.
export const artifactCacheKeyFields = {
  tenantId: v.string(),
  artifactId: v.id("artifacts"),
  versionId: v.id("artifactVersions"),
  personId: v.id("persons"),
  surface: v.string(),
  tool: v.string(),
  integrationId: v.optional(v.id("integrations")),
  cacheKey: v.string(),
}

export const artifactCaches = defineTable({
  ...artifactCacheKeyFields,
  value: v.any(),
  expiresAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_artifact", ["artifactId"])
  .index("by_artifact_and_key", ["artifactId", "cacheKey"])
  .index("by_artifact_and_person_and_surface", [
    "artifactId",
    "personId",
    "surface",
  ])
  .index("by_expires_at", ["expiresAt"])
