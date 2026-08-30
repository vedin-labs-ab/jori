import { v } from "convex/values"
import { validateJsonSchemaValue } from "../../contracts/schema/validate"
import { type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { findSingletonDocument } from "../collections/documents"
import {
  createCollection,
  removeCollection,
  restoreCollection,
  updateCollection,
} from "../collections/records"
import { type CollectionDoc } from "../collections/spec"
import { scopeValidator } from "../shared/audience"
import { getAccessibleStore, summarizeStore } from "./access"
import { storeSpec } from "./spec"

export const create = internalMutation({
  args: {
    organizationId: v.string(),
    personId: v.id("persons"),
    name: v.string(),
    description: v.optional(v.string()),
    scope: v.optional(scopeValidator),
    folderId: v.optional(v.id("folders")),
    schema: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const store = await createCollection(ctx, storeSpec, {
      ...args,
      authoring: args.schema,
    })

    return summarizeStore(store)
  },
})

export const update = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    personId: v.id("persons"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const store = await updateCollection(ctx, storeSpec, {
      organizationId: args.organizationId,
      collectionId: args.storeId,
      personId: args.personId,
      name: args.name,
      description: args.description,
    })

    return store === null ? null : summarizeStore(store)
  },
})

/** Add, replace, or remove (schema: null) the store's schema constraint. */
export const reschema = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    personId: v.id("persons"),
    schema: v.any(),
  },
  handler: async (ctx, args) => await reschemaStore(ctx, args),
})

export async function reschemaStore(
  ctx: MutationCtx,
  args: {
    organizationId: string
    storeId: Id<"collections">
    personId: Id<"persons">
    schema: unknown
  }
) {
  const store = await getAccessibleStore(ctx, args)

  await assertValueSatisfies(ctx, store, args.schema)

  const updated = await updateCollection(ctx, storeSpec, {
    organizationId: args.organizationId,
    collectionId: args.storeId,
    personId: args.personId,
    authoring: args.schema ?? null,
  })

  return updated === null ? null : summarizeStore(updated)
}

/** A schema change never bricks the store: a schema the current value
 *  violates is rejected with the mismatches, so the caller fixes the value
 *  or the schema — no silent data loss, no unwritable store. */
async function assertValueSatisfies(
  ctx: MutationCtx,
  store: CollectionDoc<"store">,
  schemaInput: unknown
) {
  const document = await findSingletonDocument(ctx, store._id)

  if (document === null) {
    return
  }

  const schema = storeSpec.compile(storeSpec.evolve(store, schemaInput))
  const issues = validateJsonSchemaValue(schema, document.value, "value")

  if (issues.length === 0) {
    return
  }

  const detail = issues
    .slice(0, 5)
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join("; ")

  throw new Error(
    `The current value does not satisfy this schema (${detail}). Fix the value or adjust the schema, then save again.`
  )
}

/** Archive an active store; removing an archived one deletes it and its
 *  value permanently. */
export const remove = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const { collectionId, ...outcome } = await removeCollection(
      ctx,
      storeSpec,
      { ...args, collectionId: args.storeId }
    )

    return { storeId: collectionId, ...outcome }
  },
})

export const restore = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const { collectionId, ...outcome } = await restoreCollection(
      ctx,
      storeSpec,
      { ...args, collectionId: args.storeId }
    )

    return { storeId: collectionId, ...outcome }
  },
})
