import { describe, expect, test } from "vitest"
import { storeDoc, testOwner } from "../../test/convex/collections"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { type CollectionDoc } from "../collections/spec"
import { summarizeStore, summarizeStoreWithOwner } from "./access"

async function storedStore(
  database: TestDatabase,
  overrides: Record<string, unknown> = {}
) {
  const storeId = await database.insert("collections", storeDoc(overrides))

  return (await database.get(storeId)) as unknown as CollectionDoc<"store">
}

describe("counting leaf properties", () => {
  test("recurses into nested objects, counting only their leaves", async () => {
    const { database } = databaseContext()
    const store = await storedStore(database, {
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          owner: {
            type: "object",
            properties: { name: { type: "string" }, email: { type: "string" } },
          },
        },
      },
    })

    expect(summarizeStore(store).propertyCount).toBe(3)
  })

  test("counts an array's item shape once", async () => {
    const { database } = databaseContext()
    const store = await storedStore(database, {
      schema: {
        type: "object",
        properties: {
          tags: { type: "array", items: { type: "string" } },
          people: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
              },
            },
          },
        },
      },
    })

    expect(summarizeStore(store).propertyCount).toBe(3)
  })

  test("counts a free-form object property as one slot", async () => {
    const { database } = databaseContext()
    const store = await storedStore(database, {
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          metadata: { type: "object", additionalProperties: true },
        },
      },
    })

    expect(summarizeStore(store).propertyCount).toBe(2)
  })

  test("counts a schema without a properties object as zero", async () => {
    const { database } = databaseContext()
    const store = await storedStore(database, { schema: { type: "object" } })

    expect(summarizeStore(store).propertyCount).toBe(0)
  })

  test("counts an empty properties object as zero", async () => {
    const { database } = databaseContext()
    const store = await storedStore(database, {
      schema: { type: "object", properties: {} },
    })

    expect(summarizeStore(store).propertyCount).toBe(0)
  })

  test("counts nothing at all for a store without a schema", async () => {
    const { database } = databaseContext()
    const store = await storedStore(database, { schema: undefined })
    const summary = summarizeStore(store)

    expect(summary.schema).toBeUndefined()
    expect(summary.propertyCount).toBeUndefined()
  })
})

describe("resolving the owner name", () => {
  test("names the owner from a linked identity", async () => {
    const { database, ctx } = databaseContext()

    await database.insert("identities", {
      organizationId: "org",
      personId: testOwner,
      provider: "slack",
      externalId: "U1",
      name: "Ada Lovelace",
    })

    const store = await storedStore(database)
    const summary = await summarizeStoreWithOwner(ctx, store)

    expect(summary.ownerName).toBe("Ada Lovelace")
  })

  test("leaves the name unset without an owner", async () => {
    const { database, ctx } = databaseContext()
    const store = await storedStore(database, { ownerId: undefined })
    const summary = await summarizeStoreWithOwner(ctx, store)

    expect(summary.ownerName).toBeUndefined()
  })

  test("leaves the name unset when no identity names the owner", async () => {
    const { database, ctx } = databaseContext()
    const store = await storedStore(database)
    const summary = await summarizeStoreWithOwner(ctx, store)

    expect(summary.ownerName).toBeUndefined()
  })
})
