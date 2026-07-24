import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { removeAutomation } from "../../automations/lifecycle"
import {
  getAppObjectGraph,
  getDeletedBlobIds,
  getDeletedTreeIds,
  getTreeEntries,
} from "./gc"
import { getOrganizationApp } from "./links"

const purgeLimit = 500

export type AppPurgeResult = {
  appId: Id<"apps">
  deleted: true
  deletedAssets: number
  deletedBlobs: number
  deletedTrees: number
  deletedVersions: number
}

export async function purgeArchivedApp(
  ctx: MutationCtx,
  args: {
    organizationId: string
    appId: Id<"apps">
  }
): Promise<AppPurgeResult> {
  const app = await getOrganizationApp(ctx, args)

  if (app.archivedAt === undefined) {
    throw new Error("Archive app before deleting it.")
  }

  const versions = await getAppVersions(ctx, app._id)
  const assets = await getAppAssets(ctx, versions)
  const graph = await getAppObjectGraph(ctx, versions)
  const deletedTreeIds = await getDeletedTreeIds(ctx, {
    appId: app._id,
    graph,
  })
  const deletedBlobIds = await getDeletedBlobIds(ctx, graph, deletedTreeIds)

  await deleteAppLinks(ctx, app._id)
  await deleteAppState(ctx, app._id)
  await deleteAppAutomations(ctx, app)
  await deleteAppAssets(ctx, assets)
  await deleteAppVersions(ctx, versions)
  await deleteAppTrees(ctx, deletedTreeIds)
  await deleteAppBlobs(ctx, deletedBlobIds)
  await ctx.db.delete(app._id)

  return {
    appId: app._id,
    deleted: true,
    deletedAssets: assets.length,
    deletedBlobs: deletedBlobIds.size,
    deletedTrees: deletedTreeIds.size,
    deletedVersions: versions.length,
  }
}

export async function deleteAppState(ctx: MutationCtx, appId: Id<"apps">) {
  const rows = await ctx.db
    .query("appState")
    .withIndex("by_app_and_scope_and_person_and_key", (index) =>
      index.eq("appId", appId)
    )
    .take(purgeLimit + 1)

  if (rows.length > purgeLimit) {
    throw new Error("App has too many state records to purge safely.")
  }

  for (const row of rows) {
    await ctx.db.delete(row._id)
  }
}

async function getAppVersions(ctx: MutationCtx, appId: Id<"apps">) {
  return await ctx.db
    .query("appVersions")
    .withIndex("by_app", (index) => index.eq("appId", appId))
    .take(purgeLimit)
}

async function getAppAssets(ctx: MutationCtx, versions: Doc<"appVersions">[]) {
  const assets: Doc<"appAssets">[] = []

  for (const version of versions) {
    assets.push(
      ...(await ctx.db
        .query("appAssets")
        .withIndex("by_version", (index) => index.eq("versionId", version._id))
        .take(purgeLimit))
    )
  }

  return assets
}

async function deleteAppLinks(ctx: MutationCtx, appId: Id<"apps">) {
  await deleteByApp(ctx, "appTools", appId)
  await deleteByApp(ctx, "appSessions", appId)
  await deleteByApp(ctx, "appShares", appId)
  await deleteByApp(ctx, "appCaches", appId)
}

async function deleteAppAutomations(ctx: MutationCtx, app: Doc<"apps">) {
  const automations = await ctx.db
    .query("automations")
    .withIndex("by_app", (index) => index.eq("appId", app._id))
    .take(purgeLimit)

  for (const automation of automations) {
    if ((await ctx.db.get(automation._id)) !== null) {
      await removeAutomation(ctx, {
        organizationId: app.organizationId,
        automationId: automation._id,
      })
    }
  }
}

async function deleteAppAssets(ctx: MutationCtx, assets: Doc<"appAssets">[]) {
  for (const asset of assets) {
    await ctx.storage.delete(asset.storageId)
    await ctx.db.delete(asset._id)
  }
}

async function deleteAppVersions(
  ctx: MutationCtx,
  versions: Doc<"appVersions">[]
) {
  for (const version of versions) {
    await ctx.db.delete(version._id)
  }
}

async function deleteAppTrees(ctx: MutationCtx, treeIds: ReadonlySet<string>) {
  for (const treeId of treeIds) {
    for (const entry of await getTreeEntries(ctx, treeId)) {
      await ctx.db.delete(entry._id)
    }

    const tree = await ctx.db
      .query("appTrees")
      .withIndex("by_object_id", (index) => index.eq("id", treeId))
      .first()

    if (tree !== null) {
      await ctx.db.delete(tree._id)
    }
  }
}

async function deleteAppBlobs(ctx: MutationCtx, blobIds: ReadonlySet<string>) {
  for (const blobId of blobIds) {
    const blob = await ctx.db
      .query("appBlobs")
      .withIndex("by_object_id", (index) => index.eq("id", blobId))
      .first()

    if (blob !== null) {
      await ctx.storage.delete(blob.storageId)
      await ctx.db.delete(blob._id)
    }
  }
}

async function deleteByApp(
  ctx: MutationCtx,
  table: "appTools" | "appSessions" | "appShares" | "appCaches",
  appId: Id<"apps">
) {
  const rows = await ctx.db
    .query(table)
    .withIndex("by_app", (index) => index.eq("appId", appId))
    .take(purgeLimit)

  for (const row of rows) {
    await ctx.db.delete(row._id)
  }
}
