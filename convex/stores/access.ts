import { countLeafProperties } from "../../contracts/schema/count"
import { type JsonSchemaObject } from "../../contracts/schema/validate"
import { type Id } from "../_generated/dataModel"
import {
  findAccessibleCollection,
  getAccessibleCollection,
  searchCollections,
} from "../collections/access"
import { type CollectionDoc } from "../collections/spec"
import { personDisplay } from "../persons/names"
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

/** Console summary: the base summary plus the owner's display. A store
 *  without a resolvable named owner reads as Jori's own in the console. */
export async function summarizeStoreWithOwner(
  ctx: QueryLikeCtx,
  store: StoreDoc
) {
  const owner =
    store.ownerId === undefined
      ? undefined
      : await personDisplay(ctx, store.ownerId)

  return {
    ...summarizeStore(store),
    ownerName: owner?.name,
    ownerImage: owner?.image,
  }
}

function toCollectionArgs(args: StoreArgs) {
  return {
    organizationId: args.organizationId,
    collectionId: args.storeId,
    personId: args.personId,
  }
}
