import { type Visibility } from "../../contracts/visibility"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  conversationGate,
  conversationVisibility,
} from "../conversations/access"
import { canSeeJob } from "../jobs/access"
import { withOwnerDisplays } from "../persons/names"
import { type QueryLikeCtx } from "../shared/context"
import { createSight, type Sight } from "../visibility/sight"

/** Per-type ceiling on one folder's listed resources; generous because a
 *  folder is a curated shelf, not an archive — no cross-type pagination. */
const contentsCap = 200

type Viewer = {
  organizationId: string
  personId: Id<"persons">
  folderId: Id<"folders"> | undefined
}

export type FolderResource = {
  type: "table" | "store" | "file" | "job" | "chat"
  id: Id<"collections"> | Id<"files"> | Id<"jobs"> | Id<"conversations">
  name: string
  visibility: Visibility
  updatedAt: number
  /** Who the row belongs to. Absent for the kinds no person owns — an
   *  job, or a file an agent run saved — which read as Jori's own. */
  ownerId?: Id<"persons">
  ownerName?: string
  ownerImage?: string
  mimeType?: string
  size?: number
  status?: Doc<"jobs">["status"]
}

/** A folder's listed resources. Owner displays are attached here rather
 *  than inside sightedResources, which the child counts also run: counting
 *  needs a length, not a name. */
export async function folderResources(
  ctx: QueryLikeCtx,
  args: Viewer
): Promise<FolderResource[]> {
  const resources = await sightedResources(
    ctx,
    createSight(ctx, args),
    args.folderId
  )

  return await withOwnerDisplays(ctx, resources)
}

export async function sightedResources(
  ctx: QueryLikeCtx,
  sight: Sight,
  folderId: Id<"folders"> | undefined
): Promise<FolderResource[]> {
  const resources = [
    ...(await folderCollections(ctx, sight, folderId)),
    ...(await folderFiles(ctx, sight, folderId)),
    ...(await folderJobs(ctx, sight, folderId)),
    ...(await folderChats(ctx, sight, folderId)),
  ]

  return resources.sort(byName)
}

/** Archived collections stay filed but hidden, matching the default list
 *  views; restoring one brings it back to its folder. */
async function folderCollections(
  ctx: QueryLikeCtx,
  sight: Sight,
  folderId: Id<"folders"> | undefined
): Promise<FolderResource[]> {
  const rows = await ctx.db
    .query("collections")
    .withIndex("by_organization_and_folder", (index) =>
      index.eq("organizationId", sight.organizationId).eq("folderId", folderId)
    )
    .take(contentsCap)
  const listed: FolderResource[] = []

  for (const row of rows) {
    if (row.archivedAt === undefined && (await sight.canSee(row))) {
      listed.push({
        type: row.kind === "table" ? "table" : "store",
        id: row._id,
        name: row.name,
        visibility: row.visibility,
        updatedAt: row.updatedAt,
        ownerId: row.ownerId,
      })
    }
  }

  return listed
}

async function folderFiles(
  ctx: QueryLikeCtx,
  sight: Sight,
  folderId: Id<"folders"> | undefined
): Promise<FolderResource[]> {
  const rows = await ctx.db
    .query("files")
    .withIndex("by_organization_and_folder", (index) =>
      index.eq("organizationId", sight.organizationId).eq("folderId", folderId)
    )
    .take(contentsCap)
  const listed: FolderResource[] = []

  for (const row of rows) {
    if (await sight.canSee(row)) {
      listed.push({
        type: "file",
        id: row._id,
        name: row.name,
        visibility: row.visibility,
        updatedAt: row.updatedAt,
        // An agent run saves a file without an owner; it reads as Jori's.
        ownerId: row.ownerId,
        mimeType: row.mimeType,
        size: row.size,
      })
    }
  }

  return listed
}

/** Jobs carry no owner: a shared one runs as the organization, so
 *  the listing shows every job as Jori's own work. */
async function folderJobs(
  ctx: QueryLikeCtx,
  sight: Sight,
  folderId: Id<"folders"> | undefined
): Promise<FolderResource[]> {
  const rows = await ctx.db
    .query("jobs")
    .withIndex("by_organization_and_folder", (index) =>
      index.eq("organizationId", sight.organizationId).eq("folderId", folderId)
    )
    .take(contentsCap)
  const listed: FolderResource[] = []

  for (const row of rows) {
    if (await canSeeJob(sight, row)) {
      listed.push({
        type: "job",
        id: row._id,
        name: row.name,
        visibility: row.visibility,
        updatedAt: row.updatedAt,
        status: row.status,
      })
    }
  }

  return listed
}

export async function folderChats(
  ctx: QueryLikeCtx,
  sight: Sight,
  folderId: Id<"folders"> | undefined
): Promise<FolderResource[]> {
  const rows = ctx.db
    .query("conversations")
    .withIndex("by_organization_and_folder", (index) =>
      index
        .eq("organizationId", sight.organizationId)
        .eq("folderId", folderId)
        .eq("surface", "console")
    )
  const listed: FolderResource[] = []

  for await (const row of rows) {
    if (
      row.surface === "console" &&
      (await sight.canSee(conversationGate(row)))
    ) {
      listed.push({
        type: "chat",
        id: row._id,
        name: row.title || "New chat",
        visibility: conversationVisibility(row),
        updatedAt: row.updatedAt ?? row._creationTime,
        ownerId: row.createdBy,
      })
      if (listed.length >= contentsCap) {
        break
      }
    }
  }

  return listed
}

function byName(left: { name: string }, right: { name: string }) {
  return left.name.localeCompare(right.name)
}
