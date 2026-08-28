import { v } from "convex/values"
import { internalMutation, internalQuery } from "../_generated/server"
import { findSingletonDocument, writeDocument } from "../collections/documents"
import { documentWrite } from "../collections/schema"
import {
  findAccessibleStore,
  getAccessibleStore,
  summarizeStore,
} from "./access"
import { storeSpec } from "./spec"

export const read = internalQuery({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    personId: v.id("persons"),
  },
  handler: async (ctx, args) => {
    const store = await findAccessibleStore(ctx, args)

    if (store === null) {
      return null
    }

    const document = await findSingletonDocument(ctx, store._id)

    return {
      ...summarizeStore(store),
      value: (document?.value ?? null) as unknown,
      version: document?.version ?? 0,
    }
  },
})

/** The store's single document goes through the collections chokepoint:
 *  access, archival, optimistic version, claim resolution, and schema
 *  validation. A held claim reports the holder instead of writing. */
export const write = internalMutation({
  args: {
    organizationId: v.string(),
    storeId: v.id("collections"),
    personId: v.id("persons"),
    expectedVersion: v.optional(v.number()),
    write: documentWrite,
  },
  handler: async (ctx, args) => {
    const store = await getAccessibleStore(ctx, args)
    const result = await writeDocument(ctx, storeSpec, store, {
      write: args.write,
      expectedVersion: args.expectedVersion,
    })

    if (result.status === "held") {
      return {
        claimed: false,
        existing: result.existing,
        version: result.version,
      }
    }

    const summary = {
      storeId: store._id,
      name: store.name,
      value: result.document.value as unknown,
      version: result.document.version,
      updatedAt: result.document.updatedAt,
    }

    return args.write.type === "claim" ? { ...summary, claimed: true } : summary
  },
})
