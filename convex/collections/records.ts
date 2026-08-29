import { v } from "convex/values"
import { stableHash } from "../../contracts/json/stable"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { resolveCreationFolder } from "../folders/tree"
import { getAccessibleCollection } from "./access"
import {
  normalizeCollectionDescription,
  normalizeCollectionName,
} from "./input"
import {
  type CollectionAuthoring,
  type CollectionDoc,
  type CollectionKind,
  isCollectionKind,
  type KindSpec,
} from "./spec"

// Collection records: create, update, archive, restore, and the batched
// purge that removes an archived collection's documents and share links.

const purgeBatchSize = 200

export async function createCollection<K extends CollectionKind>(
  ctx: MutationCtx,
  spec: KindSpec<K>,
  args: {
    organizationId: string
    personId: Id<"persons">
    name: string
    description?: string
    scope?: "organization" | "personal"
    folderId?: Id<"folders">
    authoring: unknown
  }
): Promise<CollectionDoc<K>> {
  const now = Date.now()
  const collectionId = await ctx.db.insert("collections", {
    organizationId: args.organizationId,
    ownerId: args.personId,
    scope: args.scope ?? "organization",
    folderId: await resolveCreationFolder(
      ctx,
      args.organizationId,
      args.folderId
    ),
    name: normalizeCollectionName(args.name),
    description: normalizeCollectionDescription(args.description),
    ...authoringFields(spec, spec.normalize(args.authoring)),
    createdAt: now,
    updatedAt: now,
  })
  const collection = await ctx.db.get(collectionId)

  if (collection === null || !isCollectionKind(collection, spec.kind)) {
    throw new Error(`${spec.label} creation failed.`)
  }

  return collection
}

/** The stored kind-native fields plus the hash of the compiled schema.
 *  Widening to the authoring union lets the result spread into the
 *  collections row without asserting. */
function authoringFields<K extends CollectionKind>(
  spec: KindSpec<K>,
  authoring: CollectionAuthoring<K>
) {
  const fields: CollectionAuthoring = authoring

  return { ...fields, schemaHash: stableHash(spec.compile(authoring)) }
}

export async function updateCollection<K extends CollectionKind>(
  ctx: MutationCtx,
  spec: KindSpec<K>,
  args: {
    organizationId: string
    collectionId: Id<"collections">
    personId: Id<"persons">
    name?: string
    description?: string
    authoring?: unknown
  }
): Promise<CollectionDoc<K> | null> {
  const collection = await getAccessibleCollection(ctx, spec, args)

  await ctx.db.patch(collection._id, {
    ...(args.name === undefined
      ? {}
      : { name: normalizeCollectionName(args.name) }),
    ...(args.description === undefined
      ? {}
      : { description: normalizeCollectionDescription(args.description) }),
    ...(args.authoring === undefined
      ? {}
      : authoringFields(spec, spec.evolve(collection, args.authoring))),
    updatedAt: Date.now(),
  })

  const updated = await ctx.db.get(collection._id)

  return updated !== null && isCollectionKind(updated, spec.kind)
    ? updated
    : null
}

/** Archive an active collection; removing an archived one deletes it, its
 *  documents, and its share links permanently. */
export async function removeCollection<K extends CollectionKind>(
  ctx: MutationCtx,
  spec: KindSpec<K>,
  args: {
    organizationId: string
    collectionId: Id<"collections">
    personId: Id<"persons">
  }
) {
  const collection = await getAccessibleCollection(ctx, spec, args)

  if (collection.archivedAt === undefined) {
    const now = Date.now()

    await ctx.db.patch(collection._id, { archivedAt: now, updatedAt: now })

    return { collectionId: collection._id, archived: true as const }
  }

  await ctx.db.delete(collection._id)
  await purgeBatch(ctx, { collectionId: collection._id, kind: spec.kind })

  return { collectionId: collection._id, deleted: true as const }
}

export async function restoreCollection<K extends CollectionKind>(
  ctx: MutationCtx,
  spec: KindSpec<K>,
  args: {
    organizationId: string
    collectionId: Id<"collections">
    personId: Id<"persons">
  }
) {
  const collection = await getAccessibleCollection(ctx, spec, args)

  await ctx.db.patch(collection._id, {
    archivedAt: undefined,
    updatedAt: Date.now(),
  })

  return { collectionId: collection._id, restored: true as const }
}

/** Deletes one batch of a removed collection's documents and share links,
 *  rescheduling itself while any remain, so purging a large collection
 *  never outgrows a single transaction. */
export const purge = internalMutation({
  args: {
    collectionId: v.id("collections"),
    kind: v.union(v.literal("table"), v.literal("store")),
  },
  handler: async (ctx, args) => {
    await purgeBatch(ctx, args)

    return null
  },
})

async function purgeBatch(
  ctx: MutationCtx,
  args: { collectionId: Id<"collections">; kind: CollectionKind }
) {
  const documents = await ctx.db
    .query("documents")
    .withIndex("by_collection", (index) =>
      index.eq("collectionId", args.collectionId)
    )
    .take(purgeBatchSize)
  const shares = await ctx.db
    .query("shares")
    .withIndex("by_target_and_expires_at", (index) =>
      index.eq("targetKind", args.kind).eq("targetId", args.collectionId)
    )
    .take(purgeBatchSize)

  for (const row of [...documents, ...shares]) {
    await ctx.db.delete(row._id)
  }

  if (documents.length === purgeBatchSize || shares.length === purgeBatchSize) {
    await ctx.scheduler.runAfter(0, internal.collections.records.purge, args)
  }
}
