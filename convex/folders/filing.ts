import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { canAccessAutomation } from "../automations/access"
import { canAccessCollection } from "../collections/access"
import { canViewFile } from "../files/data"
import { getOrganizationFolder } from "./tree"

// Filing is one generic flow over a small registry: each entry owns the
// per-domain edges — load the row, apply that domain's existing visibility
// predicate, patch its folderId — and the shared logic exists once. Folders
// grant nothing, so filing requires access to the RESOURCE via its own
// predicate; the folder itself is visible to every member.

export const filedResourceType = v.union(
  v.literal("collection"),
  v.literal("file"),
  v.literal("automation")
)

export type FiledResourceType = "collection" | "file" | "automation"

type FiledTable = "collections" | "files" | "automations"

type FiledDoc = Doc<FiledTable>

type FilingEntry = {
  load(ctx: MutationCtx, resourceId: string): Promise<FiledDoc | null>
  canAccess(row: FiledDoc, personId: Id<"persons">): boolean
  setFolder(
    ctx: MutationCtx,
    row: FiledDoc,
    folderId: Id<"folders"> | undefined
  ): Promise<void>
}

/** Each entry only ever receives rows its own load returned, so the
 *  narrowing casts below hold by construction. */
const registry: Record<FiledResourceType, FilingEntry> = {
  collection: {
    load: (ctx, resourceId) => loadRow(ctx, "collections", resourceId),
    canAccess: (row, personId) =>
      canAccessCollection(row as Doc<"collections">, personId),
    setFolder: (ctx, row, folderId) =>
      ctx.db.patch(row._id as Id<"collections">, { folderId }),
  },
  file: {
    load: (ctx, resourceId) => loadRow(ctx, "files", resourceId),
    canAccess: (row, personId) =>
      canViewFile(row as Doc<"files">, {
        organizationId: row.organizationId,
        personId,
      }),
    setFolder: (ctx, row, folderId) =>
      ctx.db.patch(row._id as Id<"files">, { folderId }),
  },
  automation: {
    load: (ctx, resourceId) => loadRow(ctx, "automations", resourceId),
    canAccess: (row, personId) =>
      canAccessAutomation(row as Doc<"automations">, personId),
    setFolder: (ctx, row, folderId) =>
      ctx.db.patch(row._id as Id<"automations">, { folderId }),
  },
}

/** File a resource into a folder, or unfile it with a null folderId. The
 *  acting person must be able to access the resource through its domain's
 *  predicate, and the target folder must live in the same organization. */
export async function fileResource(
  ctx: MutationCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    resourceType: FiledResourceType
    resourceId: string
    folderId: Id<"folders"> | null
  }
) {
  const folderId = await resolveTargetFolder(ctx, args)
  const entry = registry[args.resourceType]
  const row = await entry.load(ctx, args.resourceId)

  if (
    row === null ||
    row.organizationId !== args.organizationId ||
    !entry.canAccess(row, args.personId)
  ) {
    throw new Error("Resource was not found.")
  }

  // Refiling is organization, not content: updatedAt stays untouched so
  // recency-ordered lists keep meaning "content changed".
  await entry.setFolder(ctx, row, folderId)
}

async function loadRow(
  ctx: MutationCtx,
  table: FiledTable,
  resourceId: string
): Promise<FiledDoc | null> {
  const id = ctx.db.normalizeId(table, resourceId)

  return id === null ? null : await ctx.db.get(id)
}

async function resolveTargetFolder(
  ctx: MutationCtx,
  args: { organizationId: string; folderId: Id<"folders"> | null }
) {
  if (args.folderId === null) {
    return undefined
  }

  const folder = await getOrganizationFolder(
    ctx,
    args.organizationId,
    args.folderId
  )

  if (folder === null) {
    throw new Error("Folder was not found.")
  }

  return folder._id
}
