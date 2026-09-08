import { describe, expect, test } from "vitest"
import {
  type StoreOverrides,
  storeDoc,
  testOwner,
} from "../../test/convex/collections"
import { databaseContext, id } from "../../test/convex/database"
import { type CollectionDoc } from "../collections/spec"
import { summarizeStore, summarizeStoreWithOwner } from "./access"

function store(overrides: StoreOverrides = {}): CollectionDoc<"store"> {
  return {
    ...storeDoc(overrides),
    _id: id<"collections">("store"),
    _creationTime: 1,
  } as CollectionDoc<"store">
}

describe("counting leaf properties", () => {
  test("recurses into nested objects, counting only their leaves", () => {
    const document = store({
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

    expect(summarizeStore(document).propertyCount).toBe(3)
  })

  test("counts an array's item shape once", () => {
    const document = store({
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

    expect(summarizeStore(document).propertyCount).toBe(3)
  })

  test("counts a free-form object property as one slot", () => {
    const document = store({
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          metadata: { type: "object", additionalProperties: true },
        },
      },
    })

    expect(summarizeStore(document).propertyCount).toBe(2)
  })

  test("counts a schema without a properties object as zero", () => {
    const document = store({ schema: { type: "object" } })

    expect(summarizeStore(document).propertyCount).toBe(0)
  })

  test("counts an empty properties object as zero", () => {
    const document = store({
      schema: { type: "object", properties: {} },
    })

    expect(summarizeStore(document).propertyCount).toBe(0)
  })

  test("counts nothing at all for a store without a schema", () => {
    const document = store({ schema: undefined })
    const summary = summarizeStore(document)

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

    const document = store()
    const summary = await summarizeStoreWithOwner(ctx, document)

    expect(summary.ownerName).toBe("Ada Lovelace")
  })

  test("leaves the name unset without an owner", async () => {
    const { ctx } = databaseContext()
    const document = store({ ownerId: undefined })
    const summary = await summarizeStoreWithOwner(ctx, document)

    expect(summary.ownerName).toBeUndefined()
  })

  test("leaves the name unset when no identity names the owner", async () => {
    const { ctx } = databaseContext()
    const document = store()
    const summary = await summarizeStoreWithOwner(ctx, document)

    expect(summary.ownerName).toBeUndefined()
  })
})
