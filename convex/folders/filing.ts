import { type Infer, v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { automationGate } from "../automations/access"
import { createSight, type Gate, type Sight } from "../visibility/sight"
import { requireOrganizationFolder } from "./tree"

// Filing is one generic flow over a small registry: each entry owns the
// per-domain edges — load the row, expose its visibility gate, patch its
// folderId — and the shared logic exists once. Filing requires sight of the
// RESOURCE and of the target folder, since a folder's visibility cascades
// over what moves into it.

export const filedResourceType = v.union(
  v.literal("collection"),
  v.literal("file"),
  v.literal("automation")
)

export type FiledResourceType = Infer<typeof filedResourceType>

/** The tables whose rows can be filed into a folder. */
export const filedTables = ["collections", "files", "automations"] as const

type FiledTable = (typeof filedTables)[number]

type FiledDoc = Doc<FiledTable>

type FilingEntry = {
  load(ctx: MutationCtx, resourceId: string): Promise<FiledDoc | null>
  gate(row: FiledDoc): Gate
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
    gate: (row) => row as Doc<"collections">,
    setFolder: (ctx, row, folderId) =>
      ctx.db.patch(row._id as Id<"collections">, { folderId }),
  },
  file: {
    load: (ctx, resourceId) => loadRow(ctx, "files", resourceId),
    gate: (row) => row as Doc<"files">,
    setFolder: (ctx, row, folderId) =>
      ctx.db.patch(row._id as Id<"files">, { folderId }),
  },
  automation: {
    load: (ctx, resourceId) => loadRow(ctx, "automations", resourceId),
    gate: (row) => automationGate(row as Doc<"automations">),
    setFolder: (ctx, row, folderId) =>
      ctx.db.patch(row._id as Id<"automations">, { folderId }),
  },
}

/** File a resource into a folder, or unfile it with a null folderId. The
 *  acting person must see the resource and the target folder; both live in
 *  the same organization. */
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
  const sight = createSight(ctx, args)
  const folderId = await resolveTargetFolder(ctx, sight, args)
  const entry = registry[args.resourceType]
  const row = await entry.load(ctx, args.resourceId)

  if (
    row === null ||
    row.organizationId !== args.organizationId ||
    !(await sight.canSee(entry.gate(row)))
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
  sight: Sight,
  args: { organizationId: string; folderId: Id<"folders"> | null }
) {
  if (args.folderId === null) {
    return undefined
  }

  const folder = await requireOrganizationFolder(
    ctx,
    args.organizationId,
    args.folderId
  )

  if (!(await sight.canSeeFolder(folder))) {
    throw new Error("Folder was not found.")
  }

  return folder._id
}
