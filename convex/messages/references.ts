import { v } from "convex/values"
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
// unavailable, so a reference can neither probe nor leak.

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
  const found = await findTarget(ctx, sight, target)

  return found === null
    ? unavailable(target)
    : { ...target, ...found, unavailable: false }
}

function unavailable(target: ReferenceTarget): ResolvedReference {
  return { ...target, name: "", unavailable: true }
}

async function findTarget(
  ctx: QueryLikeCtx,
  sight: Sight,
  target: ReferenceTarget
): Promise<{ name: string; detail?: string } | null> {
  switch (target.kind) {
    case "job": {
      const job = await load(ctx, "jobs", target.id)

      return job !== null && (await canSeeJob(sight, job))
        ? { name: job.name, detail: await filedUnder(ctx, job.folderId) }
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
        : {
            name: collection.name,
            detail: await filedUnder(ctx, collection.folderId),
          }
    }
    case "file": {
      const file = await load(ctx, "files", target.id)

      return file !== null && (await sight.canSee(file))
        ? { name: file.name, detail: await filedUnder(ctx, file.folderId) }
        : null
    }
    case "folder": {
      const folder = await loadFolder(ctx, sight.organizationId, target.id)

      return folder !== null && (await sight.canSeeFolder(folder))
        ? { name: folder.name, detail: await filedUnder(ctx, folder.parentId) }
        : null
    }
    case "run": {
      const run = await load(ctx, "runs", target.id)

      return run !== null &&
        run.organizationId === sight.organizationId &&
        runVisibleToPerson(run, sight.personId)
        ? { name: run.snapshot.title, detail: run.status }
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
