import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { removeAutomation } from "../../automations/lifecycle"
import {
  getArtifactObjectGraph,
  getDeletedBlobIds,
  getDeletedTreeIds,
  getTreeEntries,
} from "./gc"
import { getOrganizationArtifact } from "./links"

const purgeLimit = 500

export type ArtifactPurgeResult = {
  artifactId: Id<"artifacts">
  deleted: true
  deletedAssets: number
  deletedBlobs: number
  deletedTrees: number
  deletedVersions: number
}

export async function purgeArchivedArtifact(
  ctx: MutationCtx,
  args: {
    organizationId: string
    artifactId: Id<"artifacts">
  }
): Promise<ArtifactPurgeResult> {
  const artifact = await getOrganizationArtifact(ctx, args)

  if (artifact.archivedAt === undefined) {
    throw new Error("Archive artifact before deleting it.")
  }

  const versions = await getArtifactVersions(ctx, artifact._id)
  const assets = await getArtifactAssets(ctx, versions)
  const graph = await getArtifactObjectGraph(ctx, versions)
  const deletedTreeIds = await getDeletedTreeIds(ctx, {
    artifactId: artifact._id,
    graph,
  })
  const deletedBlobIds = await getDeletedBlobIds(ctx, graph, deletedTreeIds)

  await deleteArtifactLinks(ctx, artifact._id)
  await deleteArtifactState(ctx, artifact._id)
  await deleteArtifactAutomations(ctx, artifact)
  await deleteArtifactAssets(ctx, assets)
  await deleteArtifactVersions(ctx, versions)
  await deleteArtifactTrees(ctx, deletedTreeIds)
  await deleteArtifactBlobs(ctx, deletedBlobIds)
  await ctx.db.delete(artifact._id)

  return {
    artifactId: artifact._id,
    deleted: true,
    deletedAssets: assets.length,
    deletedBlobs: deletedBlobIds.size,
    deletedTrees: deletedTreeIds.size,
    deletedVersions: versions.length,
  }
}

export async function deleteArtifactState(
  ctx: MutationCtx,
  artifactId: Id<"artifacts">
) {
  const rows = await ctx.db
    .query("artifactState")
    .withIndex("by_artifact_and_scope_and_person_and_key", (index) =>
      index.eq("artifactId", artifactId)
    )
    .take(purgeLimit + 1)

  if (rows.length > purgeLimit) {
    throw new Error("Artifact has too many state records to purge safely.")
  }

  for (const row of rows) {
    await ctx.db.delete(row._id)
  }
}

async function getArtifactVersions(
  ctx: MutationCtx,
  artifactId: Id<"artifacts">
) {
  return await ctx.db
    .query("artifactVersions")
    .withIndex("by_artifact", (index) => index.eq("artifactId", artifactId))
    .take(purgeLimit)
}

async function getArtifactAssets(
  ctx: MutationCtx,
  versions: Doc<"artifactVersions">[]
) {
  const assets: Doc<"artifactAssets">[] = []

  for (const version of versions) {
    assets.push(
      ...(await ctx.db
        .query("artifactAssets")
        .withIndex("by_version", (index) => index.eq("versionId", version._id))
        .take(purgeLimit))
    )
  }

  return assets
}

async function deleteArtifactLinks(
  ctx: MutationCtx,
  artifactId: Id<"artifacts">
) {
  await deleteByArtifact(ctx, "artifactTools", artifactId)
  await deleteByArtifact(ctx, "artifactSessions", artifactId)
  await deleteByArtifact(ctx, "artifactShares", artifactId)
  await deleteByArtifact(ctx, "artifactCaches", artifactId)
}

async function deleteArtifactAutomations(
  ctx: MutationCtx,
  artifact: Doc<"artifacts">
) {
  const automations = await ctx.db
    .query("automations")
    .withIndex("by_artifact", (index) => index.eq("artifactId", artifact._id))
    .take(purgeLimit)

  for (const automation of automations) {
    if ((await ctx.db.get(automation._id)) !== null) {
      await removeAutomation(ctx, {
        organizationId: artifact.organizationId,
        automationId: automation._id,
      })
    }
  }
}

async function deleteArtifactAssets(
  ctx: MutationCtx,
  assets: Doc<"artifactAssets">[]
) {
  for (const asset of assets) {
    await ctx.storage.delete(asset.storageId)
    await ctx.db.delete(asset._id)
  }
}

async function deleteArtifactVersions(
  ctx: MutationCtx,
  versions: Doc<"artifactVersions">[]
) {
  for (const version of versions) {
    await ctx.db.delete(version._id)
  }
}

async function deleteArtifactTrees(
  ctx: MutationCtx,
  treeIds: ReadonlySet<string>
) {
  for (const treeId of treeIds) {
    for (const entry of await getTreeEntries(ctx, treeId)) {
      await ctx.db.delete(entry._id)
    }

    const tree = await ctx.db
      .query("artifactTrees")
      .withIndex("by_object_id", (index) => index.eq("id", treeId))
      .first()

    if (tree !== null) {
      await ctx.db.delete(tree._id)
    }
  }
}

async function deleteArtifactBlobs(
  ctx: MutationCtx,
  blobIds: ReadonlySet<string>
) {
  for (const blobId of blobIds) {
    const blob = await ctx.db
      .query("artifactBlobs")
      .withIndex("by_object_id", (index) => index.eq("id", blobId))
      .first()

    if (blob !== null) {
      await ctx.storage.delete(blob.storageId)
      await ctx.db.delete(blob._id)
    }
  }
}

async function deleteByArtifact(
  ctx: MutationCtx,
  table:
    | "artifactTools"
    | "artifactSessions"
    | "artifactShares"
    | "artifactCaches",
  artifactId: Id<"artifacts">
) {
  const rows = await ctx.db
    .query(table)
    .withIndex("by_artifact", (index) => index.eq("artifactId", artifactId))
    .take(purgeLimit)

  for (const row of rows) {
    await ctx.db.delete(row._id)
  }
}
