import { type Infer, v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { purgeCollection } from "../collections/records"
import { conversationGate } from "../conversations/access"
import { purgeConversation } from "../conversations/filing/delete"
import { fileConversation } from "../conversations/filing/move"
import { purgeFile } from "../files/records"
import { jobGate } from "../jobs/access"
import { removeJob } from "../jobs/lifecycle"
import { type QueryLikeCtx } from "../shared/context"
import { createSight, type Gate, type Sight } from "../visibility/sight"
import { requireOrganizationFolder } from "./tree"

// Filing is one generic flow over a small registry: each entry owns the
// per-domain edges — load the row, expose its visibility gate, patch its
// folderId, delete it along with whatever only it owns — and the shared
// logic exists once. Filing requires sight of the RESOURCE and of the target
// folder, since a folder's visibility cascades over what moves into it.

export const filedResourceType = v.union(
  v.literal("collection"),
  v.literal("file"),
  v.literal("job"),
  v.literal("chat")
)

export type FiledResourceType = Infer<typeof filedResourceType>

/** The tables whose rows can be filed into a folder. */
export const filedTables = [
  "collections",
  "files",
  "jobs",
  "conversations",
] as const

type FiledTable = (typeof filedTables)[number]

type FiledDoc = Doc<FiledTable>

type FilingEntry = {
  load(ctx: QueryLikeCtx, resourceId: string): Promise<FiledDoc | null>
  gate(row: FiledDoc): Gate
  setFolder(
    ctx: MutationCtx,
    row: FiledDoc,
    folderId: Id<"folders"> | undefined,
    defer?: boolean,
    actorId?: Id<"persons">
  ): Promise<void>
  /** Permanent removal of the row and everything only it owns. */
  purge(
    ctx: MutationCtx,
    row: FiledDoc,
    destination?: Id<"folders">
  ): Promise<void>
}

const tableByType: Record<FiledResourceType, FiledTable> = {
  collection: "collections",
  file: "files",
  job: "jobs",
  chat: "conversations",
}

/** Each entry only ever receives rows from its own table, so the narrowing
 *  casts below hold by construction. */
const registry: Record<FiledTable, FilingEntry> = {
  conversations: {
    load: async (ctx, resourceId) => {
      const row = (await loadRow(
        ctx,
        "conversations",
        resourceId
      )) as Doc<"conversations"> | null
      return row?.surface === "console" && row.createdBy !== undefined
        ? row
        : null
    },
    gate: (row) => conversationGate(row as Doc<"conversations">),
    setFolder: (ctx, row, folderId, defer, actorId) =>
      fileConversation(
        ctx,
        row as Doc<"conversations">,
        folderId,
        defer,
        actorId
      ),
    purge: (ctx, row, destination) =>
      purgeConversation(ctx, row as Doc<"conversations">, destination),
  },
  collections: {
    load: (ctx, resourceId) => loadRow(ctx, "collections", resourceId),
    gate: (row) => row as Doc<"collections">,
    setFolder: (ctx, row, folderId) =>
      ctx.db.patch(row._id as Id<"collections">, { folderId }),
    purge: (ctx, row) => purgeCollection(ctx, row as Doc<"collections">),
  },
  files: {
    load: (ctx, resourceId) => loadRow(ctx, "files", resourceId),
    gate: (row) => row as Doc<"files">,
    setFolder: (ctx, row, folderId) =>
      ctx.db.patch(row._id as Id<"files">, { folderId }),
    purge: (ctx, row) => purgeFile(ctx, row as Doc<"files">),
  },
  jobs: {
    load: (ctx, resourceId) => loadRow(ctx, "jobs", resourceId),
    gate: (row) => jobGate(row as Doc<"jobs">),
    setFolder: (ctx, row, folderId) =>
      ctx.db.patch(row._id as Id<"jobs">, { folderId }),
    purge: async (ctx, row) => {
      const jobId = row._id as Id<"jobs">

      // Removing a job removes the jobs it owns, which can
      // be filed in the same folder: one may already be gone by the time
      // the sweep reaches its row.
      if ((await ctx.db.get(jobId)) === null) {
        return
      }

      await removeJob(ctx, {
        organizationId: row.organizationId,
        jobId,
      })
    },
  },
}

/** The visibility gate of one filed row, for surfaces that ask what a move
 *  would do before asking for it. Null when nothing answers to that id. */
export async function loadFiledGate(
  ctx: QueryLikeCtx,
  resourceType: FiledResourceType,
  resourceId: string
): Promise<Gate | null> {
  const entry = registry[tableByType[resourceType]]
  const row = await entry.load(ctx, resourceId)

  return row === null ? null : entry.gate(row)
}

/** Refiling one row, without the sight checks a caller-driven move needs:
 *  a folder deletion moves what it held whether or not the deleter can see
 *  it. Organization, not content, so updatedAt stays untouched. */
export async function refileRow(
  ctx: MutationCtx,
  table: FiledTable,
  row: FiledDoc,
  folderId: Id<"folders"> | undefined
) {
  await registry[table].setFolder(ctx, row, folderId, true)
}

/** Permanently delete one filed row and everything only it owns — the
 *  per-domain edge of a folder deletion that takes its contents along. */
export async function purgeRow(
  ctx: MutationCtx,
  table: FiledTable,
  row: FiledDoc,
  destination?: Id<"folders">
) {
  await registry[table].purge(ctx, row, destination)
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
  const entry = registry[tableByType[args.resourceType]]
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
  await entry.setFolder(ctx, row, folderId, false, args.personId)
}

async function loadRow(
  ctx: QueryLikeCtx,
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
