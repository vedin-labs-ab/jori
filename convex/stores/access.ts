import { countLeafProperties } from "../../contracts/schema/count"
import { type JsonSchemaObject } from "../../contracts/schema/validate"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  findAccessibleCollection,
  getAccessibleCollection,
  searchCollections,
} from "../collections/access"
import { type CollectionDoc } from "../collections/spec"
import { type QueryLikeCtx } from "../shared/context"
import { type ResourceViewer } from "../visibility/resources"
import { storeSpec } from "./spec"

type StoreDoc = CollectionDoc<"store">

type StoreArgs = ResourceViewer & {
  storeId: Id<"collections">
}

export async function searchStores(
  ctx: QueryLikeCtx,
  args: ResourceViewer & {
    query?: string
    includeArchived?: boolean
    limit?: number
  }
) {
  return await searchCollections(ctx, storeSpec, args)
}

/** Load a store only if it is in the organization and visible to the person;
 *  null otherwise, so callers cannot tell missing from inaccessible. */
export async function findAccessibleStore(ctx: QueryLikeCtx, args: StoreArgs) {
  return await findAccessibleCollection(ctx, storeSpec, toCollectionArgs(args))
}

export async function getAccessibleStore(ctx: QueryLikeCtx, args: StoreArgs) {
  return await getAccessibleCollection(ctx, storeSpec, toCollectionArgs(args))
}

export function summarizeStore(store: StoreDoc) {
  return {
    storeId: store._id,
    name: store.name,
    visibility: store.visibility,
    ownerId: store.ownerId,
    folderId: store.folderId,
    schema: store.schema as JsonSchemaObject | undefined,
    schemaHash: store.schemaHash,
    propertyCount: countLeafProperties(
      store.schema as JsonSchemaObject | undefined
    ),
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
    archivedAt: store.archivedAt,
  }
}

/** Value writes have their own clock, separate from store metadata edits. */
export function summarizeStoreValue(document: Doc<"documents"> | null) {
  return {
    value: (document?.value ?? null) as unknown,
    version: document?.version ?? 0,
    valueUpdatedAt: document?.updatedAt ?? null,
  }
}

function toCollectionArgs(args: StoreArgs) {
  return {
    organizationId: args.organizationId,
    collectionId: args.storeId,
    personId: args.personId,
    runId: args.runId,
  }
}
