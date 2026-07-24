import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"

const gcLimit = 500

export type AppObjectGraph = {
  blobIds: Set<string>
  treeIds: Set<string>
}

export async function getAppObjectGraph(
  ctx: MutationCtx,
  versions: Doc<"appVersions">[]
) {
  const graph: AppObjectGraph = { blobIds: new Set(), treeIds: new Set() }

  for (const version of versions) {
    await addTreeToGraph(ctx, graph, version.treeId)
  }

  return graph
}

export async function getDeletedTreeIds(
  ctx: MutationCtx,
  args: {
    appId: Id<"apps">
    graph: AppObjectGraph
  }
) {
  const retainedTreeIds = await getRetainedTreeIds(ctx, args)

  return difference(args.graph.treeIds, retainedTreeIds)
}

export async function getDeletedBlobIds(
  ctx: MutationCtx,
  graph: AppObjectGraph,
  deletedTreeIds: ReadonlySet<string>
) {
  const deletedBlobIds = new Set<string>()

  for (const blobId of graph.blobIds) {
    const parentEntries = await ctx.db
      .query("appEntries")
      .withIndex("by_entry", (index) => index.eq("id", blobId))
      .take(gcLimit)

    if (canDeleteBlob(parentEntries, deletedTreeIds)) {
      deletedBlobIds.add(blobId)
    }
  }

  return deletedBlobIds
}

export function canDeleteBlob(
  parentEntries: Pick<Doc<"appEntries">, "treeId">[],
  deletedTreeIds: ReadonlySet<string>
) {
  return (
    parentEntries.length > 0 &&
    parentEntries.every((entry) => deletedTreeIds.has(entry.treeId))
  )
}

export async function getTreeEntries(ctx: MutationCtx, treeId: string) {
  return await ctx.db
    .query("appEntries")
    .withIndex("by_tree", (index) => index.eq("treeId", treeId))
    .take(gcLimit)
}

async function addTreeToGraph(
  ctx: MutationCtx,
  graph: AppObjectGraph,
  treeId: string
) {
  if (graph.treeIds.has(treeId)) {
    return
  }

  graph.treeIds.add(treeId)

  for (const entry of await getTreeEntries(ctx, treeId)) {
    if (entry.mode === "directory") {
      await addTreeToGraph(ctx, graph, entry.id)
    } else if (entry.mode === "file" || entry.mode === "executable") {
      graph.blobIds.add(entry.id)
    }
  }
}

async function getRetainedTreeIds(
  ctx: MutationCtx,
  args: {
    appId: Id<"apps">
    graph: AppObjectGraph
  }
) {
  const retained = new Set<string>()

  for (const treeId of args.graph.treeIds) {
    if (
      await isTreeRetained(ctx, {
        appId: args.appId,
        candidateTreeIds: args.graph.treeIds,
        retainedTreeIds: retained,
        treeId,
      })
    ) {
      retained.add(treeId)
    }
  }

  return retained
}

async function isTreeRetained(
  ctx: MutationCtx,
  args: {
    appId: Id<"apps">
    candidateTreeIds: ReadonlySet<string>
    retainedTreeIds: Set<string>
    treeId: string
  }
): Promise<boolean> {
  if (args.retainedTreeIds.has(args.treeId)) {
    return true
  }

  if (await hasExternalVersionRoot(ctx, args.appId, args.treeId)) {
    return true
  }

  return await hasRetainedParentTree(ctx, args)
}

async function hasExternalVersionRoot(
  ctx: MutationCtx,
  appId: Id<"apps">,
  treeId: string
) {
  const versions = await ctx.db
    .query("appVersions")
    .withIndex("by_tree", (index) => index.eq("treeId", treeId))
    .take(gcLimit)

  return versions.some((version) => version.appId !== appId)
}

async function hasRetainedParentTree(
  ctx: MutationCtx,
  args: {
    appId: Id<"apps">
    candidateTreeIds: ReadonlySet<string>
    retainedTreeIds: Set<string>
    treeId: string
  }
) {
  const parentEntries = await ctx.db
    .query("appEntries")
    .withIndex("by_entry", (index) => index.eq("id", args.treeId))
    .take(gcLimit)

  for (const entry of parentEntries) {
    if (!args.candidateTreeIds.has(entry.treeId)) {
      return true
    }

    if (await isTreeRetained(ctx, { ...args, treeId: entry.treeId })) {
      return true
    }
  }

  return false
}

function difference<T>(values: ReadonlySet<T>, excluded: ReadonlySet<T>) {
  return new Set([...values].filter((value) => !excluded.has(value)))
}
