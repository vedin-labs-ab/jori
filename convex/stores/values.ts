import { v } from "convex/values"
import { assertStoreValue } from "../../contracts/stores/contract"
import { resolveStoreWrite } from "../../contracts/stores/write"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server"
import { assertExpectedVersion } from "../materials/input"
import { type QueryLikeCtx } from "../shared/context"
import {
  findAccessibleStore,
  getAccessibleStore,
  summarizeStore,
} from "./access"
import { storeWrite } from "./schema"

export const read = internalQuery({
  args: {
    organizationId: v.string(),
    storeId: v.id("stores"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const store = await findAccessibleStore(ctx, args)

    if (store === null) {
      return null
    }

    const document = await findValueDocument(ctx, store._id)

    return {
      ...summarizeStore(store),
      value: (document?.value ?? null) as unknown,
      version: document?.version ?? 0,
    }
  },
})

/** The one write path for store values: access, archival, optimistic
 *  version, claim resolution, and schema validation all live here. */
export const write = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("stores"),
    personId: v.id("persons"),
    expectedVersion: v.optional(v.number()),
    write: storeWrite,
  },
  handler: async (ctx, args) => {
    const store = await getAccessibleStore(ctx, args)

    if (store.archivedAt !== undefined) {
      throw new Error("Store is archived. Restore it to write.")
    }

    const existing = await findValueDocument(ctx, store._id)
    const currentVersion = existing?.version ?? 0

    assertExpectedVersion(
      args.expectedVersion,
      currentVersion,
      `Store ${store.name}`
    )

    const resolved = resolveStoreWrite(existing?.value, args.write)

    if (resolved.kind === "held") {
      return {
        claimed: false,
        existing: resolved.existing,
        version: currentVersion,
      }
    }

    assertStoreValue({
      schema: store.schema,
      value: resolved.value,
      name: store.name,
    })

    const summary =
      existing === null
        ? await insertValueDocument(ctx, store, resolved.value)
        : await updateValueDocument(ctx, existing, store, resolved.value)

    return args.write.type === "claim" ? { ...summary, claimed: true } : summary
  },
})

async function insertValueDocument(
  ctx: MutationCtx,
  store: Doc<"stores">,
  value: unknown
) {
  const now = Date.now()

  await ctx.db.insert("storeValues", {
    organizationId: store.organizationId,
    storeId: store._id,
    value,
    version: 1,
    createdAt: now,
    updatedAt: now,
  })

  return summarizeWrite(store, value, 1, now)
}

async function updateValueDocument(
  ctx: MutationCtx,
  existing: Doc<"storeValues">,
  store: Doc<"stores">,
  value: unknown
) {
  const version = existing.version + 1
  const updatedAt = Date.now()

  await ctx.db.patch(existing._id, { value, version, updatedAt })

  return summarizeWrite(store, value, version, updatedAt)
}

function summarizeWrite(
  store: Doc<"stores">,
  value: unknown,
  version: number,
  updatedAt: number
) {
  return {
    storeId: store._id,
    name: store.name,
    value,
    version,
    updatedAt,
  }
}

export async function findValueDocument(
  ctx: QueryLikeCtx,
  storeId: Id<"stores">
) {
  return await ctx.db
    .query("storeValues")
    .withIndex("by_store", (index) => index.eq("storeId", storeId))
    .first()
}
