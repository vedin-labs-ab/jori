import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { boundedNumber } from "../shared/input"
import {
  createResourceSight,
  type ResourceViewer,
} from "../visibility/resources"
import { type Sight } from "../visibility/sight"
import {
  type CollectionDoc,
  type CollectionKind,
  isCollectionKind,
  type KindSpec,
} from "./spec"

// Collections share the one grant-based visibility model: who sees a
// collection is answered by visibility/sight.ts, from the collection's own
// setting, its ancestor folders, and the viewer's identity and teams.

const searchLimit = 100

/** Null for missing, foreign, invisible, and wrong-kind collections alike,
 *  so callers cannot tell missing from inaccessible. */
export async function accessibleCollection<K extends CollectionKind>(
  sight: Sight,
  collection: Doc<"collections"> | null,
  kind: K
): Promise<CollectionDoc<K> | null> {
  if (
    collection === null ||
    !isCollectionKind(collection, kind) ||
    !(await sight.canSee(collection))
  ) {
    return null
  }

  return collection
}

type CollectionArgs = ResourceViewer & {
  collectionId: Id<"collections">
}

/** Load a collection only if it is in the organization, of the spec's kind,
 *  and visible to the person; null otherwise. */
export async function findAccessibleCollection<K extends CollectionKind>(
  ctx: QueryLikeCtx,
  spec: KindSpec<K>,
  args: CollectionArgs
): Promise<CollectionDoc<K> | null> {
  const sight = await createResourceSight(ctx, args)

  return await accessibleCollection(
    sight,
    await ctx.db.get(args.collectionId),
    spec.kind
  )
}

export async function getAccessibleCollection<K extends CollectionKind>(
  ctx: QueryLikeCtx,
  spec: KindSpec<K>,
  args: CollectionArgs
): Promise<CollectionDoc<K>> {
  const collection = await findAccessibleCollection(ctx, spec, args)

  if (collection === null) {
    throw new Error(`${spec.label} not found.`)
  }

  return collection
}

/** Recent collections of one kind the person may see and asked for:
 *  visible, active unless archived ones were requested, and matching the
 *  name query. */
export async function searchCollections<K extends CollectionKind>(
  ctx: QueryLikeCtx,
  spec: KindSpec<K>,
  args: ResourceViewer & {
    query?: string
    includeArchived?: boolean
    limit?: number
  },
  suppliedSight?: Sight
): Promise<CollectionDoc<K>[]> {
  const candidates = await ctx.db
    .query("collections")
    .withIndex("by_organization_and_kind_and_updated_at", (index) =>
      index.eq("organizationId", args.organizationId).eq("kind", spec.kind)
    )
    .order("desc")
    .take(searchLimit)
  const sight = suppliedSight ?? (await createResourceSight(ctx, args))
  const query = args.query?.trim().toLowerCase()
  const limit = boundedNumber(args.limit, 25, 1, searchLimit)
  const matches: CollectionDoc<K>[] = []

  for (const collection of candidates) {
    if (matches.length >= limit) {
      break
    }

    if (
      isCollectionKind(collection, spec.kind) &&
      matchesSearch(collection, query, args.includeArchived) &&
      (await sight.canSee(collection))
    ) {
      matches.push(collection)
    }
  }

  return matches
}

function matchesSearch(
  collection: Doc<"collections">,
  query: string | undefined,
  includeArchived: boolean | undefined
) {
  return (
    (includeArchived === true || collection.archivedAt === undefined) &&
    (query === undefined ||
      query === "" ||
      collection.name.toLowerCase().includes(query))
  )
}
