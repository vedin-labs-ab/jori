import { type ReferenceTarget } from "../../contracts/replies/parts"
import { type ReferenceKind } from "../../contracts/replies/references"
import { type Doc, type Id, type TableNames } from "../_generated/dataModel"
import { accessibleCollection } from "../collections/access"
import { findVisibleConsoleConversation } from "../conversations/resolve"
import { getOrganizationFolder } from "../folders/tree"
import { canSeeJob } from "../jobs/access"
import { canSeeRun } from "../runs/visibility"
import { type QueryLikeCtx } from "../shared/context"
import { type Sight } from "../visibility/sight"

// The row a reference target names, read through the predicate its own
// page uses: gone, foreign, invisible, and malformed all read as null, so
// a reference can neither probe nor leak.

/** What a target names: its name, and the folder it is filed under — a
 *  folder's parent, for a folder — or a status that stands in for that:
 *  a run's, or "Chat" for a conversation. */
type LoadedReference = {
  name: string
  folderId?: Id<"folders">
  status?: string
}

type ReferenceLoader = (
  ctx: QueryLikeCtx,
  sight: Sight,
  id: string
) => Promise<LoadedReference | null>

/** Each kind's own table, and the read its page makes. Tables and stores
 *  are both collections, told apart by their kind. */
const references: Record<
  ReferenceKind,
  { table: TableNames; load: ReferenceLoader }
> = {
  file: { table: "files", load: loadFile },
  table: {
    table: "collections",
    load: (ctx, sight, id) => loadCollection(ctx, sight, "table", id),
  },
  store: {
    table: "collections",
    load: (ctx, sight, id) => loadCollection(ctx, sight, "store", id),
  },
  job: { table: "jobs", load: loadJob },
  folder: { table: "folders", load: loadFolder },
  run: { table: "runs", load: loadRun },
  chat: { table: "conversations", load: loadChat },
}

export async function loadReference(
  ctx: QueryLikeCtx,
  sight: Sight,
  target: ReferenceTarget
): Promise<LoadedReference | null> {
  return await references[target.kind].load(ctx, sight, target.id)
}

/** The table a kind's ids belong to. */
export function referenceTable(kind: ReferenceKind): TableNames {
  return references[kind].table
}

async function loadJob(ctx: QueryLikeCtx, sight: Sight, id: string) {
  const job = await load(ctx, "jobs", id)

  return job !== null && (await canSeeJob(sight, job))
    ? { name: job.name, folderId: job.folderId }
    : null
}

async function loadCollection(
  ctx: QueryLikeCtx,
  sight: Sight,
  kind: "table" | "store",
  id: string
) {
  const collection = await accessibleCollection(
    sight,
    await load(ctx, "collections", id),
    kind
  )

  return collection === null
    ? null
    : { name: collection.name, folderId: collection.folderId }
}

async function loadFile(ctx: QueryLikeCtx, sight: Sight, id: string) {
  const file = await load(ctx, "files", id)

  return file !== null && (await sight.canSee(file))
    ? { name: file.name, folderId: file.folderId }
    : null
}

async function loadFolder(ctx: QueryLikeCtx, sight: Sight, id: string) {
  const folderId = ctx.db.normalizeId("folders", id)
  const folder =
    folderId === null
      ? null
      : await getOrganizationFolder(ctx, sight.organizationId, folderId)

  return folder !== null && (await sight.canSeeFolder(folder))
    ? { name: folder.name, folderId: folder.parentId }
    : null
}

async function loadRun(ctx: QueryLikeCtx, sight: Sight, id: string) {
  const run = await load(ctx, "runs", id)

  return run !== null &&
    run.organizationId === sight.organizationId &&
    (await canSeeRun(ctx, run, sight.personId, sight))
    ? { name: run.snapshot.title, status: run.status, folderId: run.folderId }
    : null
}

async function loadChat(ctx: QueryLikeCtx, sight: Sight, id: string) {
  const conversationId = ctx.db.normalizeId("conversations", id)
  const conversation =
    conversationId === null
      ? null
      : await findVisibleConsoleConversation(
          ctx,
          {
            conversationId,
            organizationId: sight.organizationId,
            personId: sight.personId,
          },
          sight
        )

  return conversation === null
    ? null
    : {
        name: conversation.title ?? "",
        status: "Chat",
        folderId: conversation.folderId,
      }
}

/** The row an id names in the table its kind implies; an id of another
 *  shape is no row at all. */
async function load<TableName extends TableNames>(
  ctx: QueryLikeCtx,
  table: TableName,
  id: string
): Promise<Doc<TableName> | null> {
  const normalized = ctx.db.normalizeId(table, id)

  return normalized === null ? null : await ctx.db.get(normalized)
}
