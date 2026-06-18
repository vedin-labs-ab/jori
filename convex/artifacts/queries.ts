import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../_generated/server"
import { canAccessArtifact, searchArtifacts, summarizeArtifact } from "./access"
import { getTenantArtifact } from "./storage/links"

export const getExistingBlobIds = internalQuery({
  args: {
    ids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing: string[] = []

    for (const id of args.ids) {
      const blob = await ctx.db
        .query("artifactBlobs")
        .withIndex("by_object_id", (index) => index.eq("id", id))
        .first()

      if (blob !== null) {
        existing.push(id)
      }
    }

    return existing
  },
})

export const searchForAgent = internalQuery({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    query: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const artifacts = await searchArtifacts(ctx, args)

    return artifacts.map((artifact) => summarizeArtifact(artifact))
  },
})

export const readForAgent = internalQuery({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId)

    if (
      artifact === null ||
      artifact.tenantId !== args.tenantId ||
      !canAccessArtifact(artifact, args.userId)
    ) {
      return null
    }

    const version =
      artifact.versionId === undefined
        ? null
        : await ctx.db.get(artifact.versionId)

    return {
      ...summarizeArtifact(artifact),
      version:
        version === null
          ? null
          : {
              versionId: version._id,
              parentVersionId: version.parentVersionId,
              treeId: version.treeId,
              entrypoint: version.entrypoint,
              sdk: version.sdk,
              message: version.message,
              createdBy: version.createdBy,
              createdAt: version.createdAt,
            },
    }
  },
})

export const getArtifactIdForRun = internalQuery({
  args: {
    tenantId: v.string(),
    runId: v.id("runs"),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    if (
      run === null ||
      run.tenantId !== args.tenantId ||
      run.automationId === undefined
    ) {
      return null
    }

    const automation = await ctx.db.get(run.automationId)

    return automation?.tenantId === args.tenantId
      ? (automation.artifactId ?? null)
      : null
  },
})

export const listSourceFiles = internalQuery({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    versionId: v.optional(v.id("artifactVersions")),
  },
  handler: async (ctx, args) => {
    const artifact = await getTenantArtifact(ctx, args)
    const versionId = args.versionId ?? artifact.versionId

    if (versionId === undefined) {
      return null
    }

    const version = await ctx.db.get(versionId)

    if (
      version === null ||
      version.artifactId !== args.artifactId ||
      version.tenantId !== args.tenantId
    ) {
      return null
    }

    return await collectSourceFiles(ctx, version.treeId)
  },
})

export const getAsset = internalQuery({
  args: {
    versionId: v.id("artifactVersions"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("artifactAssets")
      .withIndex("by_version_and_path", (index) =>
        index.eq("versionId", args.versionId).eq("path", args.path)
      )
      .first()
  },
})

export const getArtifactForRender = internalQuery({
  args: {
    artifactId: v.id("artifacts"),
  },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId)

    if (
      artifact === null ||
      artifact.archivedAt !== undefined ||
      artifact.versionId === undefined
    ) {
      return null
    }

    return {
      artifactId: artifact._id,
      title: artifact.title,
      versionId: artifact.versionId,
    }
  },
})

async function collectSourceFiles(
  ctx: QueryCtx,
  treeId: string,
  prefix = ""
): Promise<
  Array<{
    path: string
    blobId: string
    storageId: Id<"_storage">
    mimeType: string
    byteSize: number
  }>
> {
  const entries = await ctx.db
    .query("artifactEntries")
    .withIndex("by_tree", (index) => index.eq("treeId", treeId))
    .take(500)
  const files = []

  for (const entry of entries) {
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`

    if (entry.mode === "directory") {
      files.push(...(await collectSourceFiles(ctx, entry.id, path)))
      continue
    }

    const blob = await ctx.db
      .query("artifactBlobs")
      .withIndex("by_object_id", (index) => index.eq("id", entry.id))
      .first()

    if (blob !== null) {
      files.push({
        path,
        blobId: blob.id,
        storageId: blob.storageId,
        mimeType: blob.mimeType,
        byteSize: blob.byteSize,
      })
    }
  }

  return files.sort((left, right) => left.path.localeCompare(right.path))
}
