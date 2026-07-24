import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { scopeValidator } from "../shared/audience"

export const appAccess = scopeValidator

/** What a session may do: members get the full tool surface, share-link
 *  viewers only read published assets and shared-scope state. */
export const appSessionGrant = v.union(v.literal("member"), v.literal("share"))

export type AppSessionGrant = Infer<typeof appSessionGrant>

export const appMode = v.union(
  v.literal("directory"),
  v.literal("file"),
  v.literal("executable")
)

const appHashAlgorithm = v.union(v.literal("sha1"), v.literal("sha256"))

const appStateScope = v.union(v.literal("personal"), v.literal("shared"))

const appContractStateEntry = v.object({
  name: v.string(),
  key: v.string(),
  scope: appStateScope,
  description: v.optional(v.string()),
  usage: v.optional(v.string()),
  schemaName: v.string(),
  schemaVersion: v.number(),
  schemaHash: v.string(),
  schema: v.any(),
})

export const appContract = v.object({
  version: v.number(),
  state: v.array(appContractStateEntry),
})

/** Template provenance for a published version: which template, at which
 *  recipe version, produced its content. Absent on user-authored versions,
 *  so a template-less head marks the app as customized. */
export const appTemplateStamp = v.object({
  key: v.string(),
  version: v.number(),
})

export const apps = defineTable({
  organizationId: v.string(),
  ownerId: v.id("persons"),
  title: v.string(),
  access: appAccess,
  contract: v.optional(appContract),
  versionId: v.optional(v.id("appVersions")),
  createdAt: v.number(),
  updatedAt: v.number(),
  archivedAt: v.optional(v.number()),
  /** Set only by playbook provisioning: this app is the canonical
   *  instance of the template for its partition (one per person or organization). */
  template: v.optional(v.string()),
  templatePartition: v.optional(v.string()),
})
  .index("by_organization_and_updated_at", ["organizationId", "updatedAt"])
  .index("by_organization_and_owner", ["organizationId", "ownerId"])
  .index("by_organization_and_template", [
    "organizationId",
    "templatePartition",
    "template",
  ])

export const appVersions = defineTable({
  organizationId: v.string(),
  appId: v.id("apps"),
  parentVersionId: v.optional(v.id("appVersions")),
  treeId: v.string(),
  entrypoint: v.string(),
  sdk: v.string(),
  message: v.optional(v.string()),
  template: v.optional(appTemplateStamp),
  createdBy: v.id("persons"),
  createdAt: v.number(),
})
  .index("by_app", ["appId"])
  .index("by_tree", ["treeId"])

export const appTrees = defineTable({
  id: v.string(),
  algorithm: appHashAlgorithm,
  createdAt: v.number(),
}).index("by_object_id", ["id"])

export const appEntries = defineTable({
  treeId: v.string(),
  name: v.string(),
  mode: appMode,
  id: v.string(),
})
  .index("by_tree", ["treeId"])
  .index("by_entry", ["id"])

export const appBlobs = defineTable({
  id: v.string(),
  algorithm: appHashAlgorithm,
  mimeType: v.string(),
  byteSize: v.number(),
  storageId: v.id("_storage"),
  createdAt: v.number(),
}).index("by_object_id", ["id"])

export const appTools = defineTable({
  organizationId: v.string(),
  appId: v.id("apps"),
  versionId: v.optional(v.id("appVersions")),
  tool: v.string(),
  integrationId: v.optional(v.id("integrations")),
  approvedBy: v.id("persons"),
  approvedAt: v.number(),
  revokedAt: v.optional(v.number()),
})
  .index("by_app", ["appId"])
  .index("by_app_and_tool", ["appId", "tool"])

export const appSessions = defineTable({
  organizationId: v.string(),
  appId: v.id("apps"),
  versionId: v.id("appVersions"),
  personId: v.id("persons"),
  access: appAccess,
  grant: appSessionGrant,
  tokenSecret: v.string(),
  tokenExpiresAt: v.number(),
  createdAt: v.number(),
  seenAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_app", ["appId"])
  .index("by_app_and_seen_at", ["appId", "seenAt"])

/** Each share is an independent grant with its own secret and expiry; an
 *  app can have several live at once. */
export const appShares = defineTable({
  organizationId: v.string(),
  appId: v.id("apps"),
  createdBy: v.id("persons"),
  secret: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_app", ["appId"])
  .index("by_app_and_expires_at", ["appId", "expiresAt"])
  .index("by_app_and_secret", ["appId", "secret"])

export const appAssets = defineTable({
  organizationId: v.string(),
  appId: v.id("apps"),
  versionId: v.id("appVersions"),
  path: v.string(),
  mimeType: v.string(),
  byteSize: v.number(),
  storageId: v.id("_storage"),
  createdAt: v.number(),
})
  .index("by_version", ["versionId"])
  .index("by_version_and_path", ["versionId", "path"])

export const appState = defineTable({
  organizationId: v.string(),
  appId: v.id("apps"),
  personId: v.optional(v.id("persons")),
  scope: appStateScope,
  contractName: v.optional(v.string()),
  schemaName: v.optional(v.string()),
  schemaVersion: v.optional(v.number()),
  schemaHash: v.optional(v.string()),
  key: v.string(),
  value: v.any(),
  version: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_app_and_scope_and_person_and_key", [
  "appId",
  "scope",
  "personId",
  "key",
])

// Identifies one cache entry; shared by the cache read/write args and lookup.
export const appCacheKeyFields = {
  organizationId: v.string(),
  appId: v.id("apps"),
  versionId: v.id("appVersions"),
  personId: v.id("persons"),
  surface: v.string(),
  tool: v.string(),
  integrationId: v.optional(v.id("integrations")),
  cacheKey: v.string(),
}

export const appCaches = defineTable({
  ...appCacheKeyFields,
  value: v.any(),
  expiresAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_app", ["appId"])
  .index("by_app_and_key", ["appId", "cacheKey"])
  .index("by_app_and_person_and_surface", ["appId", "personId", "surface"])
  .index("by_expires_at", ["expiresAt"])
