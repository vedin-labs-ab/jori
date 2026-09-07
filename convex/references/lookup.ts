import { type ReferenceKind } from "../../contracts/replies/parts"
import { type Doc, type Id, type TableNames } from "../_generated/dataModel"
import { accessibleCollection } from "../collections/access"
import { findVisibleConsoleConversation } from "../conversations/resolve"
import { getOrganizationFolder } from "../folders/tree"
import { canSeeJob } from "../jobs/access"
import { runVisibleToPerson } from "../runs/console/filters"
import { type QueryLikeCtx } from "../shared/context"
import { type Sight } from "../visibility/sight"

// The row a reference target names, read through the predicate its own
// page uses: gone, foreign, invisible, and malformed all read as null, so
// a reference can neither probe nor leak.

export type ReferenceTarget = { kind: ReferenceKind; id: string }

/** What a target names: its name, and the folder it is filed under — a
 *  folder's parent, for a folder — or a status that stands in for that:
 *  a run's, or "Chat" for a conversation. */
export type LoadedReference = {
  name: string
  folderId?: Id<"folders">
  status?: string
}

export async function loadReference(
  ctx: QueryLikeCtx,
  sight: Sight,
  target: ReferenceTarget
): Promise<LoadedReference | null> {
  switch (target.kind) {
    case "job":
      return await loadJob(ctx, sight, target.id)
    case "table":
    case "store":
      return await loadCollection(ctx, sight, target.kind, target.id)
    case "file":
      return await loadFile(ctx, sight, target.id)
    case "folder":
      return await loadFolder(ctx, sight, target.id)
    case "run":
      return await loadRun(ctx, sight, target.id)
    case "chat":
      return await loadChat(ctx, sight, target.id)
  }
}

/** The table a kind's ids belong to. */
export function referenceTable(kind: ReferenceKind): TableNames {
  switch (kind) {
    case "file":
      return "files"
    case "table":
    case "store":
      return "collections"
    case "job":
      return "jobs"
    case "folder":
      return "folders"
    case "run":
      return "runs"
    case "chat":
      return "conversations"
  }
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
    runVisibleToPerson(run, sight.personId)
    ? { name: run.snapshot.title, status: run.status }
    : null
}

async function loadChat(ctx: QueryLikeCtx, sight: Sight, id: string) {
  const conversationId = ctx.db.normalizeId("conversations", id)
  const conversation =
    conversationId === null
      ? null
      : await findVisibleConsoleConversation(ctx, {
          conversationId,
          organizationId: sight.organizationId,
          personId: sight.personId,
        })

  return conversation === null
    ? null
    : { name: conversation.title ?? "", status: "Chat" }
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
