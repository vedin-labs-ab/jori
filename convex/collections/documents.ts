import { type PaginationOptions } from "convex/server"
import {
  type DocumentWrite,
  resolveDocumentWrite,
} from "../../contracts/collections/write"
import { assertJsonSerializable } from "../../contracts/json/stable"
import { assertJsonSchemaValue } from "../../contracts/schema/validate"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { insertRow, type QueryLikeCtx } from "../shared/context"
import { assertExpectedVersion } from "./input"
import { type InsertAnchor, resolveInsertOrders } from "./order"
import { type CollectionDoc, type CollectionKind, type KindSpec } from "./spec"

// The one write chokepoint for collection documents: archival, optimistic
// versioning, claim resolution, and validation against the compiled JSON
// Schema all live here. Kind differences enter through the KindSpec.

type WriteResult =
  | { status: "written"; document: Doc<"documents">; created: boolean }
  | { status: "held"; existing: unknown; version: number }

export async function findSingletonDocument(
  ctx: QueryLikeCtx,
  collectionId: Id<"collections">
) {
  return await ctx.db
    .query("documents")
    .withIndex("by_collection", (index) =>
      index.eq("collectionId", collectionId)
    )
    .first()
}

async function getCollectionDocument<K extends CollectionKind>(
  ctx: QueryLikeCtx,
  spec: KindSpec<K>,
  collection: CollectionDoc<K>,
  documentId: Id<"documents">
) {
  const document = await ctx.db.get(documentId)

  if (document === null || document.collectionId !== collection._id) {
    throw new Error(`${spec.documentLabel(collection)} not found.`)
  }

  return document
}

/** Documents in grid order: ascending `order`, so the first page starts at
 *  the top row and appends land at the end. Documents predating the order
 *  backfill (collections/order.ts) sort first rather than vanishing. */
export async function pageDocuments(
  ctx: QueryLikeCtx,
  collectionId: Id<"collections">,
  paginationOpts: PaginationOptions
) {
  return await ctx.db
    .query("documents")
    .withIndex("by_collection_and_order", (index) =>
      index.eq("collectionId", collectionId)
    )
    .order("asc")
    .paginate(paginationOpts)
}

/** Resolve a write against its target document and persist the result.
 *  A singleton collection targets its only document, creating it on first
 *  write; any other collection targets one existing document by id, and
 *  new documents enter through insertDocuments instead. */
export async function writeDocument<K extends CollectionKind>(
  ctx: MutationCtx,
  spec: KindSpec<K>,
  collection: CollectionDoc<K>,
  input: {
    documentId?: Id<"documents">
    write: DocumentWrite
    expectedVersion?: number
  }
): Promise<WriteResult> {
  assertWritable(spec, collection)

  const document = await resolveTarget(ctx, spec, collection, input.documentId)
  const version = document?.version ?? 0

  assertExpectedVersion(
    input.expectedVersion,
    version,
    spec.documentLabel(collection)
  )

  const resolved = resolveDocumentWrite(document?.value, input.write)

  if (resolved.kind === "held") {
    return { status: "held", existing: resolved.existing, version }
  }

  assertDocumentValue(spec, collection, resolved.value)

  if (document === null) {
    const created = await createDocument(ctx, collection._id, resolved.value)

    return { status: "written", document: created, created: true }
  }

  const updatedAt = Date.now()
  const updated = { version: version + 1, value: resolved.value, updatedAt }

  await ctx.db.patch(document._id, updated)

  return {
    status: "written",
    document: { ...document, ...updated },
    created: false,
  }
}

/** Batched insert: every value is validated before the first write, so a
 *  batch either lands whole or not at all. Without an anchor the batch
 *  appends at the end; with one it lands beside the anchor document. */
export async function insertDocuments<K extends CollectionKind>(
  ctx: MutationCtx,
  spec: KindSpec<K>,
  collection: CollectionDoc<K>,
  values: unknown[],
  anchor?: InsertAnchor
) {
  assertWritable(spec, collection)

  if (spec.singleton) {
    throw new Error(`A ${spec.label.toLowerCase()} holds a single document.`)
  }

  for (const value of values) {
    assertDocumentValue(spec, collection, value)
  }

  const orders = await resolveInsertOrders(
    ctx,
    collection._id,
    values.length,
    anchor === undefined
      ? undefined
      : {
          document: await getCollectionDocument(
            ctx,
            spec,
            collection,
            anchor.documentId
          ),
          placement: anchor.placement,
        }
  )
  const inserted: Doc<"documents">[] = []

  for (const [index, value] of values.entries()) {
    inserted.push(
      await createDocument(ctx, collection._id, value, orders[index])
    )
  }

  return inserted
}

export async function deleteDocument<K extends CollectionKind>(
  ctx: MutationCtx,
  spec: KindSpec<K>,
  collection: CollectionDoc<K>,
  input: { documentId: Id<"documents">; expectedVersion?: number }
) {
  assertWritable(spec, collection)

  const document = await getCollectionDocument(
    ctx,
    spec,
    collection,
    input.documentId
  )

  assertExpectedVersion(
    input.expectedVersion,
    document.version,
    spec.documentLabel(collection)
  )
  await ctx.db.delete(document._id)
  await adjustDocumentCount(ctx, collection._id, -1)

  return document
}

/** Cardinality only ever changes through createDocument and deleteDocument,
 *  so the denormalized counter moves here and nowhere else. The count is
 *  re-read so batched inserts see their own increments. */
async function adjustDocumentCount(
  ctx: MutationCtx,
  collectionId: Id<"collections">,
  delta: number
) {
  const collection = await ctx.db.get(collectionId)

  if (collection === null) {
    throw new Error("Collection not found while counting documents.")
  }

  await ctx.db.patch(collectionId, {
    documentCount: Math.max(0, (collection.documentCount ?? 0) + delta),
  })
}

/** Validate one document value: within the kind's byte budget and matching
 *  the collection's compiled JSON Schema. */
function assertDocumentValue<K extends CollectionKind>(
  spec: KindSpec<K>,
  collection: CollectionDoc<K>,
  value: unknown
) {
  const label = spec.documentLabel(collection)

  assertJsonSerializable({
    label: `${label} value`,
    maxBytes: spec.maxDocumentBytes,
    value,
  })
  assertJsonSchemaValue({ label, schema: spec.compile(collection), value })
}

function assertWritable<K extends CollectionKind>(
  spec: KindSpec<K>,
  collection: CollectionDoc<K>
) {
  if (collection.archivedAt !== undefined) {
    throw new Error(`${spec.label} is archived. Restore it to write.`)
  }
}

async function resolveTarget<K extends CollectionKind>(
  ctx: MutationCtx,
  spec: KindSpec<K>,
  collection: CollectionDoc<K>,
  documentId: Id<"documents"> | undefined
) {
  if (spec.singleton) {
    return await findSingletonDocument(ctx, collection._id)
  }

  if (documentId === undefined) {
    throw new Error(
      `A ${spec.label.toLowerCase()} write requires a documentId.`
    )
  }

  return await getCollectionDocument(ctx, spec, collection, documentId)
}

/** Callers without a precomputed order (the singleton first write) append. */
async function createDocument(
  ctx: MutationCtx,
  collectionId: Id<"collections">,
  value: unknown,
  order?: number
) {
  const now = Date.now()
  const [resolvedOrder] =
    order === undefined
      ? await resolveInsertOrders(ctx, collectionId, 1)
      : [order]
  const document = await insertRow(ctx, "documents", {
    collectionId,
    value,
    version: 1,
    order: resolvedOrder,
    createdAt: now,
    updatedAt: now,
  })

  await adjustDocumentCount(ctx, collectionId, 1)

  return document
}
