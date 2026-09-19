import { describe, expect, test, vi } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import {
  type StoreOverrides,
  storeDoc,
  testOwner,
} from "../../test/convex/materials/collections"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { writeDocument } from "../collections/documents"
import { type CollectionDoc } from "../collections/spec"
import { reschemaStore } from "./records"
import { storeSpec } from "./spec"

const principal = { organizationId: "org", personId: testOwner }

const totalSchema = {
  type: "object",
  properties: { total: { type: "number" } },
  required: ["total"],
}

async function createStore(
  database: TestDatabase,
  overrides: StoreOverrides = {}
) {
  return (await database.insert(
    "collections",
    storeDoc(overrides)
  )) as Id<"collections">
}

async function writeValue(
  ctx: MutationCtx,
  storeId: Id<"collections">,
  value: unknown
) {
  const store = (await ctx.db.get(storeId)) as CollectionDoc<"store">

  await writeDocument(ctx, storeSpec, store, {
    write: { type: "replace", value },
  })
}

describe("changing a store's schema", () => {
  test("adds a schema and updates its hash and property count", async () => {
    const { database, ctx } = databaseContext()
    const storeId = await createStore(database, { schema: undefined })
    const beforeHash = (await database.get(storeId))?.schemaHash

    const summary = await reschemaStore(ctx, {
      ...principal,
      storeId,
      schema: totalSchema,
    })

    expect(summary?.schema).toEqual(totalSchema)
    expect(summary?.propertyCount).toBe(1)
    expect(summary?.schemaHash).not.toBe(beforeHash)
  })

  test("removes the schema when passed null", async () => {
    const { database, ctx } = databaseContext()
    const storeId = await createStore(database, { schema: totalSchema })

    const summary = await reschemaStore(ctx, {
      ...principal,
      storeId,
      schema: null,
    })

    expect(summary?.schema).toBeUndefined()
    expect(summary?.propertyCount).toBeUndefined()
    expect(await database.get(storeId)).not.toHaveProperty("schema")
  })

  test("rejects an unsupported schema", async () => {
    const { database, ctx } = databaseContext()
    const storeId = await createStore(database)

    await expect(
      reschemaStore(ctx, { ...principal, storeId, schema: { type: "string" } })
    ).rejects.toThrow("Store schema must describe a JSON object.")
  })
})

describe("guarding the current value", () => {
  test("rejects a schema the current value violates, listing mismatches", async () => {
    const { database, ctx } = databaseContext()
    const storeId = await createStore(database, { schema: undefined })

    await writeValue(ctx, storeId, { total: "not a number" })

    await expect(
      reschemaStore(ctx, { ...principal, storeId, schema: totalSchema })
    ).rejects.toThrow("value.total: must be number")

    const stored = (await database.get(storeId)) as { schema?: unknown }

    expect(stored.schema).toBeUndefined()
  })

  test("accepts a schema the current value already satisfies", async () => {
    const { database, ctx } = databaseContext()
    const storeId = await createStore(database, { schema: undefined })

    await writeValue(ctx, storeId, { total: 12 })

    const summary = await reschemaStore(ctx, {
      ...principal,
      storeId,
      schema: totalSchema,
    })

    expect(summary?.schema).toEqual(totalSchema)
  })
})

describe("writing without a schema", () => {
  test("a schemaless store accepts any JSON object and rejects the rest", async () => {
    const { database, ctx } = databaseContext()
    const storeId = await createStore(database, { schema: undefined })
    const store = (await database.get(storeId)) as CollectionDoc<"store">

    const result = await writeDocument(ctx, storeSpec, store, {
      write: { type: "replace", value: { anything: ["goes", 1, true] } },
    })

    expect(result.status).toBe("written")
    await expect(
      writeDocument(ctx, storeSpec, store, {
        write: { type: "replace", value: "just a string" },
      })
    ).rejects.toThrow("must be object")
  })
})

vi.mock("../discovery/sync/intent", () => ({ mark: vi.fn() }))
