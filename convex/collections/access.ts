import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { boundedNumber } from "../shared/input"
import {
  type CollectionDoc,
  type CollectionKind,
  isCollectionKind,
  type KindSpec,
} from "./spec"

// Collections share one visibility model: organization-scoped collections
// are visible to every member, personal ones only to their owner.

const searchLimit = 100

export function canAccessCollection(
  collection: { scope: "organization" | "personal"; ownerId?: Id<"persons"> },
  personId: Id<"persons">
) {
  return collection.scope === "organization" || collection.ownerId === personId
}

/** Null for missing, foreign, invisible, and wrong-kind collections alike,
 *  so callers cannot tell missing from inaccessible. */
export function accessibleCollection<K extends CollectionKind>(
  collection: Doc<"collections"> | null,
  args: { organizationId: string; personId: Id<"persons">; kind: K }
): CollectionDoc<K> | null {
  if (
    collection === null ||
    !isCollectionKind(collection, args.kind) ||
    collection.organizationId !== args.organizationId ||
    !canAccessCollection(collection, args.personId)
  ) {
    return null
  }

  return collection
}

type CollectionArgs = {
  organizationId: string
  collectionId: Id<"collections">
  personId: Id<"persons">
}

/** Load a collection only if it is in the organization, of the spec's kind,
 *  and visible to the person; null otherwise. */
export async function findAccessibleCollection<K extends CollectionKind>(
  ctx: QueryLikeCtx,
  spec: KindSpec<K>,
  args: CollectionArgs
): Promise<CollectionDoc<K> | null> {
  return accessibleCollection(await ctx.db.get(args.collectionId), {
    ...args,
    kind: spec.kind,
  })
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
  args: {
    organizationId: string
    personId: Id<"persons">
    query?: string
    includeArchived?: boolean
    limit?: number
  }
): Promise<CollectionDoc<K>[]> {
  const candidates = await ctx.db
    .query("collections")
    .withIndex("by_organization_and_kind_and_updated_at", (index) =>
      index.eq("organizationId", args.organizationId).eq("kind", spec.kind)
    )
    .order("desc")
    .take(searchLimit)
  const query = args.query?.trim().toLowerCase()
  const limit = boundedNumber(args.limit, 25, 1, searchLimit)

  return candidates
    .filter(
      (collection): collection is CollectionDoc<K> =>
        isCollectionKind(collection, spec.kind) &&
        canAccessCollection(collection, args.personId) &&
        (args.includeArchived === true ||
          collection.archivedAt === undefined) &&
        (query === undefined ||
          query === "" ||
          collection.name.toLowerCase().includes(query))
    )
    .slice(0, limit)
}
