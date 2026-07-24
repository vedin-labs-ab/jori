import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../_generated/server"
import { findAccessibleApp, searchApps, summarizeApp } from "./access"
import { getOrganizationApp } from "./storage/links"

export const getExistingBlobIds = internalQuery({
  args: {
    ids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing: string[] = []

    for (const id of args.ids) {
      const blob = await ctx.db
        .query("appBlobs")
        .withIndex("by_object_id", (index) => index.eq("id", id))
        .first()

      if (blob !== null) {
        existing.push(id)
      }
    }

    return existing
  },
})

export const findTemplate = internalQuery({
  args: {
    organizationId: v.string(),
    template: v.string(),
    partition: v.string(),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db
      .query("apps")
      .withIndex("by_organization_and_template", (index) =>
        index
          .eq("organizationId", args.organizationId)
          .eq("templatePartition", args.partition)
          .eq("template", args.template)
      )
      .first()

    if (app === null) {
      return null
    }

    const head =
      app.versionId === undefined ? null : await ctx.db.get(app.versionId)

    // A head without a template stamp is user-published: customized.
    return { app, headTemplate: head?.template ?? null }
  },
})

export const searchForAgent = internalQuery({
  args: {
    organizationId: v.string(),
    personId: v.id("persons"),
    query: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apps = await searchApps(ctx, args)

    return apps.map((app) => summarizeApp(app))
  },
})

export const readForAgent = internalQuery({
  args: {
    organizationId: v.string(),
    personId: v.id("persons"),
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const app = await findAccessibleApp(ctx, args)

    if (app === null) {
      return null
    }

    const version =
      app.versionId === undefined ? null : await ctx.db.get(app.versionId)

    return {
      ...summarizeApp(app),
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

export const getAppIdForRun = internalQuery({
  args: {
    organizationId: v.string(),
    runId: v.id("runs"),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    if (run === null || run.organizationId !== args.organizationId) {
      return null
    }

    if (run.appId !== undefined) {
      return run.appId
    }

    if (run.automationId === undefined) {
      return null
    }

    const automation = await ctx.db.get(run.automationId)

    return automation?.organizationId === args.organizationId
      ? (automation.appId ?? null)
      : null
  },
})

export const listSourceFiles = internalQuery({
  args: {
    organizationId: v.string(),
    appId: v.id("apps"),
    versionId: v.optional(v.id("appVersions")),
  },
  handler: async (ctx, args) => {
    const app = await getOrganizationApp(ctx, args)
    const versionId = args.versionId ?? app.versionId

    if (versionId === undefined) {
      return null
    }

    const version = await ctx.db.get(versionId)

    if (
      version === null ||
      version.appId !== args.appId ||
      version.organizationId !== args.organizationId
    ) {
      return null
    }

    return await collectSourceFiles(ctx, version.treeId)
  },
})

export const getAsset = internalQuery({
  args: {
    versionId: v.id("appVersions"),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appAssets")
      .withIndex("by_version_and_path", (index) =>
        index.eq("versionId", args.versionId).eq("path", args.path)
      )
      .first()
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
    .query("appEntries")
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
      .query("appBlobs")
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
