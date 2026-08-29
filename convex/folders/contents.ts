import { type Doc, type Id } from "../_generated/dataModel"
import { canAccessAutomation } from "../automations/access"
import { canAccessCollection } from "../collections/access"
import { canViewFile } from "../files/data"
import { type QueryLikeCtx } from "../shared/context"
import { summarizeFolder, treeCap } from "./tree"

// A folder's listing: subfolders plus the filed resources the caller may
// see. Folders carry no access of their own, so each resource type applies
// its domain's predicate — a personal resource filed by its owner simply
// does not appear for anyone else.

/** Per-type ceiling on one folder's listed resources; generous because a
 *  folder is a curated shelf, not an archive — no cross-type pagination. */
const contentsCap = 200

type Viewer = {
  organizationId: string
  personId: Id<"persons">
  folderId: Id<"folders">
}

export type FolderResource = {
  type: "table" | "store" | "file" | "automation"
  id: Id<"collections"> | Id<"files"> | Id<"automations">
  name: string
  scope: "organization" | "personal"
  updatedAt: number
  mimeType?: string
  size?: number
  status?: Doc<"automations">["status"]
}

export async function folderChildren(
  ctx: QueryLikeCtx,
  args: { organizationId: string; folderId: Id<"folders"> }
) {
  const children = await ctx.db
    .query("folders")
    .withIndex("by_organization_and_parent", (index) =>
      index
        .eq("organizationId", args.organizationId)
        .eq("parentId", args.folderId)
    )
    .take(treeCap)

  return children.map(summarizeFolder).sort(byName)
}

export async function folderResources(
  ctx: QueryLikeCtx,
  args: Viewer
): Promise<FolderResource[]> {
  const resources = [
    ...(await folderCollections(ctx, args)),
    ...(await folderFiles(ctx, args)),
    ...(await folderAutomations(ctx, args)),
  ]

  return resources.sort(byName)
}

/** Archived collections stay filed but hidden, matching the default list
 *  views; restoring one brings it back to its folder. */
async function folderCollections(
  ctx: QueryLikeCtx,
  args: Viewer
): Promise<FolderResource[]> {
  const rows = await ctx.db
    .query("collections")
    .withIndex("by_folder", (index) => index.eq("folderId", args.folderId))
    .take(contentsCap)

  return rows
    .filter(
      (row) =>
        row.organizationId === args.organizationId &&
        row.archivedAt === undefined &&
        canAccessCollection(row, args.personId)
    )
    .map((row) => ({
      type: row.kind === "table" ? ("table" as const) : ("store" as const),
      id: row._id,
      name: row.name,
      scope: row.scope,
      updatedAt: row.updatedAt,
    }))
}

async function folderFiles(
  ctx: QueryLikeCtx,
  args: Viewer
): Promise<FolderResource[]> {
  const rows = await ctx.db
    .query("files")
    .withIndex("by_folder", (index) => index.eq("folderId", args.folderId))
    .take(contentsCap)

  return rows
    .filter((row) => canViewFile(row, args))
    .map((row) => ({
      type: "file" as const,
      id: row._id,
      name: row.name,
      scope: row.scope,
      updatedAt: row.updatedAt,
      mimeType: row.mimeType,
      size: row.size,
    }))
}

async function folderAutomations(
  ctx: QueryLikeCtx,
  args: Viewer
): Promise<FolderResource[]> {
  const rows = await ctx.db
    .query("automations")
    .withIndex("by_folder", (index) => index.eq("folderId", args.folderId))
    .take(contentsCap)

  return rows
    .filter(
      (row) =>
        row.organizationId === args.organizationId &&
        canAccessAutomation(row, args.personId)
    )
    .map((row) => ({
      type: "automation" as const,
      id: row._id,
      name: row.name,
      scope: row.scope,
      updatedAt: row.updatedAt,
      status: row.status,
    }))
}

function byName(left: { name: string }, right: { name: string }) {
  return left.name.localeCompare(right.name)
}
