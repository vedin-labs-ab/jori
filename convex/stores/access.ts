import { type JsonSchemaObject } from "../../contracts/schema/validate"
import { type Doc, type Id } from "../_generated/dataModel"
import { accessibleMaterial, filterMaterialSearch } from "../materials/access"
import { type QueryLikeCtx } from "../shared/context"
import { boundedNumber } from "../shared/input"

const storeSearchLimit = 100

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
  const stores = await ctx.db
    .query("stores")
    .withIndex("by_organization_and_updated_at", (index) =>
      index.eq("organizationId", args.organizationId)
    )
    .order("desc")
    .take(storeSearchLimit)

  return filterMaterialSearch(stores, {
    ...args,
    limit: boundedNumber(args.limit, 25, 1, storeSearchLimit),
  })
}

/** Load a store only if it is in the organization and visible to the person;
 *  null otherwise, so callers cannot tell missing from inaccessible. */
export async function findAccessibleStore(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    storeId: Id<"stores">
    personId: Id<"persons">
  }
) {
  return accessibleMaterial(await ctx.db.get(args.storeId), args)
}

export async function getAccessibleStore(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    storeId: Id<"stores">
    personId: Id<"persons">
  }
) {
  const store = await findAccessibleStore(ctx, args)

  if (store === null) {
    throw new Error("Store not found.")
  }

  return store
}

export function summarizeStore(store: Doc<"stores">) {
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
