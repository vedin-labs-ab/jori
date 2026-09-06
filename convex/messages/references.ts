import { v } from "convex/values"
import {
  type MessageContext,
  readMessageContext,
} from "../../contracts/replies/answers"
import { type ReferenceKind } from "../../contracts/replies/parts"
import { type Doc, type Id, type TableNames } from "../_generated/dataModel"
import { query } from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { requireUserId } from "../access/users"
import { accessibleCollection } from "../collections/access"
import { ancestorPath, getOrganizationFolder } from "../folders/tree"
import { canSeeJob } from "../jobs/access"
import { resolvePersonByIdentity } from "../persons/identity/links"
import { runVisibleToPerson } from "../runs/console/filters"
import { type QueryLikeCtx } from "../shared/context"
import { createSight, type Sight } from "../visibility/sight"

// What a reply's references and a message's context point at, named for
// the console. Every kind reads through the predicate its own page uses,
// and a miss of any sort — gone, foreign, invisible, malformed — comes back
// unavailable, so a reference can neither probe nor leak. A console
// message's context is the same shape — the resource or folder whose page
// the chat was opened from — and is read back here for the run: where to
// file it, what to say in its snapshot, and what to tell the model.

export const referenceTargetValidator = v.object({
  kind: v.union(
    v.literal("file"),
    v.literal("table"),
    v.literal("store"),
    v.literal("job"),
    v.literal("folder"),
    v.literal("run")
  ),
  id: v.string(),
})

export type ReferenceTarget = { kind: ReferenceKind; id: string }

/** A context as the run reads it: the target, its name, and the folder
 *  the run it starts is filed under — the folder itself, or the one a
 *  filed resource is in. */
export type ResolvedContext = MessageContext & {
  name: string
  folderId?: Id<"folders">
}

export type ResolvedReference = ReferenceTarget & {
  name: string
  /** Where it is filed, root folder first; a run says how it stands. */
  detail?: string
  unavailable: boolean
}

export const resolve = query({
  args: {
    organizationId: v.string(),
    targets: v.array(referenceTargetValidator),
  },
  handler: async (ctx, args): Promise<ResolvedReference[]> => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return args.targets.map(unavailable)
    }

    const sight = createSight(ctx, {
      organizationId: args.organizationId,
      personId: await resolvePersonByIdentity(ctx, {
        organizationId: args.organizationId,
        provider: "auth",
        externalId: requireUserId(access.identity),
      }),
    })

    return await Promise.all(
      args.targets.map((target) => resolveReferenceTarget(ctx, sight, target))
    )
  },
})

export async function resolveReferenceTarget(
  ctx: QueryLikeCtx,
  sight: Sight,
  target: ReferenceTarget
): Promise<ResolvedReference> {
  const found = await loadReference(ctx, sight, target)

  if (found === null) {
    return unavailable(target)
  }

  const detail = found.status ?? (await filedUnder(ctx, found.folderId))

  return {
    ...target,
    name: found.name,
    ...(detail === undefined ? {} : { detail }),
    unavailable: false,
  }
}

function unavailable(target: ReferenceTarget): ResolvedReference {
  return { ...target, name: "", unavailable: true }
}

/** What a target names, read through the predicate its own page uses:
 *  the name, and the folder it is filed under — a folder's parent, for a
 *  folder — or a run's status, which stands in for that. Gone, foreign,
 *  invisible, and malformed all read as null. */
export async function loadReference(
  ctx: QueryLikeCtx,
  sight: Sight,
  target: ReferenceTarget
): Promise<{ name: string; folderId?: Id<"folders">; status?: string } | null> {
  switch (target.kind) {
    case "job": {
      const job = await load(ctx, "jobs", target.id)

      return job !== null && (await canSeeJob(sight, job))
        ? { name: job.name, folderId: job.folderId }
        : null
    }
    case "table":
    case "store": {
      const collection = await accessibleCollection(
        sight,
        await load(ctx, "collections", target.id),
        target.kind
      )

      return collection === null
        ? null
        : { name: collection.name, folderId: collection.folderId }
    }
    case "file": {
      const file = await load(ctx, "files", target.id)

      return file !== null && (await sight.canSee(file))
        ? { name: file.name, folderId: file.folderId }
        : null
    }
    case "folder": {
      const folder = await loadFolder(ctx, sight.organizationId, target.id)

      return folder !== null && (await sight.canSeeFolder(folder))
        ? { name: folder.name, folderId: folder.parentId }
        : null
    }
    case "run": {
      const run = await load(ctx, "runs", target.id)

      return run !== null &&
        run.organizationId === sight.organizationId &&
        runVisibleToPerson(run, sight.personId)
        ? { name: run.snapshot.title, status: run.status }
        : null
    }
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

async function loadFolder(
  ctx: QueryLikeCtx,
  organizationId: string,
  id: string
) {
  const normalized = ctx.db.normalizeId("folders", id)

  return normalized === null
    ? null
    : await getOrganizationFolder(ctx, organizationId, normalized)
}

/** The folders something is filed under, root first, as one line. */
async function filedUnder(
  ctx: QueryLikeCtx,
  folderId: Id<"folders"> | undefined
) {
  const folder = folderId === undefined ? null : await ctx.db.get(folderId)

  return folder === null
    ? undefined
    : (await ancestorPath(ctx, folder))
        .map((segment) => segment.name)
        .join(" › ")
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
  }
}

/** The context's id in its kind's own table, or nothing for an id of
 *  another shape — the check `references.resolve` makes, made before the
 *  message is kept. */
export function normalizeConsoleContext(
  ctx: QueryLikeCtx,
  context: MessageContext
): MessageContext | null {
  const id = ctx.db.normalizeId(referenceTable(context.kind), context.id)

  return id === null ? null : { kind: context.kind, id }
}

/** The context a message's data carries, resolved for the viewer: the
 *  target's name, and its folder when it has one. A target the viewer may
 *  not see, or that is gone, resolves to nothing. */
export async function resolveConsoleContext(
  ctx: QueryLikeCtx,
  sight: Sight,
  data: unknown
): Promise<ResolvedContext | undefined> {
  const context = readMessageContext(data)

  if (context === undefined) {
    return undefined
  }

  const reference = await loadReference(ctx, sight, context)

  if (reference === null) {
    return undefined
  }

  const folderId =
    context.kind === "folder"
      ? (context.id as Id<"folders">)
      : reference.folderId

  return {
    ...context,
    name: reference.name,
    ...(folderId === undefined ? {} : { folderId }),
  }
}

/** One line for the model: what the message was sent about, with the id
 *  the way the jori tools take it, so the resource can be read without
 *  guessing. A context that no longer resolves says so, id and all. */
export function consoleContextLine(
  context: MessageContext,
  resolved: ResolvedContext | undefined
) {
  const id = `${context.kind}Id: ${context.id}`

  return resolved === undefined
    ? `Opened about a ${context.kind} that is no longer available (${id})`
    : `Opened about ${context.kind} «${resolved.name}» (${id})`
}
