import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"

export type TreeInput = {
  id: string
  entries: Array<{
    name: string
    mode: "directory" | "file" | "executable"
    id: string
  }>
}

export async function insertVersion(
  ctx: MutationCtx,
  args: {
    organizationId: string
    appId: Id<"apps">
    parentVersionId?: Id<"appVersions">
    treeId: string
    trees: TreeInput[]
    blobs: Array<{
      id: string
      mimeType: string
      byteSize: number
      storageId: Id<"_storage">
    }>
    assets: Array<{
      path: string
      mimeType: string
      byteSize: number
      storageId: Id<"_storage">
    }>
    entrypoint: string
    sdk: string
    message?: string
    template?: { key: string; version: number }
    createdBy: Id<"persons">
    createdAt: number
  }
) {
  await insertBlobs(ctx, args.blobs, args.createdAt)
  await insertTrees(ctx, args.trees, args.createdAt)

  const versionId = await ctx.db.insert("appVersions", {
    organizationId: args.organizationId,
    appId: args.appId,
    parentVersionId: args.parentVersionId,
    treeId: args.treeId,
    entrypoint: args.entrypoint,
    sdk: args.sdk,
    message: args.message,
    template: args.template,
    createdBy: args.createdBy,
    createdAt: args.createdAt,
  })

  for (const asset of args.assets) {
    await ctx.db.insert("appAssets", {
      organizationId: args.organizationId,
      appId: args.appId,
      versionId,
      path: asset.path,
      mimeType: asset.mimeType,
      byteSize: asset.byteSize,
      storageId: asset.storageId,
      createdAt: args.createdAt,
    })
  }

  return versionId
}

async function insertBlobs(
  ctx: MutationCtx,
  blobs: Array<{
    id: string
    mimeType: string
    byteSize: number
    storageId: Id<"_storage">
  }>,
  now: number
) {
  for (const blob of blobs) {
    const existing = await ctx.db
      .query("appBlobs")
      .withIndex("by_object_id", (index) => index.eq("id", blob.id))
      .first()

    if (existing === null) {
      await ctx.db.insert("appBlobs", {
        id: blob.id,
        algorithm: "sha1",
        mimeType: blob.mimeType,
        byteSize: blob.byteSize,
        storageId: blob.storageId,
        createdAt: now,
      })
    }
  }
}

async function insertTrees(ctx: MutationCtx, trees: TreeInput[], now: number) {
  for (const tree of trees) {
    const existing = await ctx.db
      .query("appTrees")
      .withIndex("by_object_id", (index) => index.eq("id", tree.id))
      .first()

    if (existing !== null) {
      continue
    }

    await ctx.db.insert("appTrees", {
      id: tree.id,
      algorithm: "sha1",
      createdAt: now,
    })

    for (const entry of tree.entries) {
      await ctx.db.insert("appEntries", {
        treeId: tree.id,
        name: entry.name,
        mode: entry.mode,
        id: entry.id,
      })
    }
  }
}
