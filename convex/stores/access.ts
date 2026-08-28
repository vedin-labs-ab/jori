import { type JsonSchemaObject } from "../../contracts/schema/validate"
import { type Id } from "../_generated/dataModel"
import {
  findAccessibleCollection,
  getAccessibleCollection,
  searchCollections,
} from "../collections/access"
import { type CollectionDoc } from "../collections/spec"
import { type QueryLikeCtx } from "../shared/context"
import { storeSpec } from "./spec"

type StoreDoc = CollectionDoc<"store">

type StoreArgs = {
  organizationId: string
  storeId: Id<"collections">
  personId: Id<"persons">
}

export async function searchStores(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
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
    description: store.description,
    scope: store.scope,
    ownerId: store.ownerId,
    schema: store.schema as JsonSchemaObject,
    schemaHash: store.schemaHash,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
    archivedAt: store.archivedAt,
  }
}

function toCollectionArgs(args: StoreArgs) {
  return {
    organizationId: args.organizationId,
    collectionId: args.storeId,
    personId: args.personId,
  }
}
