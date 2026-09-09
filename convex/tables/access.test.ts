import { describe, expect, test } from "vitest"
import {
  type TableOverrides,
  tableDoc,
  testOwner,
} from "../../test/convex/collections"
import { databaseContext, id } from "../../test/convex/database"
import { type CollectionDoc } from "../collections/spec"
import { summarizeTable, summarizeTableWithOwner } from "./access"

function table(overrides: TableOverrides = {}): CollectionDoc<"table"> {
  return {
    ...tableDoc(overrides),
    _id: id<"collections">("table"),
    _creationTime: 1,
  } as CollectionDoc<"table">
}

describe("summarizing a table", () => {
  test("carries the maintained document counter", () => {
    const document = table({ documentCount: 42 })

    expect(summarizeTable(document).rowCount).toBe(42)
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

    const document = table()
    const summary = await summarizeTableWithOwner(ctx, document)

    expect(summary.ownerName).toBe("Ada Lovelace")
  })

  test("carries the sign-in avatar from the linked auth account", async () => {
    // The auth component resolves users through ctx.runQuery; the stub is
    // that component answering with the account's provider image.
    const { database, ctx } = databaseContext({
      runQuery: async () => ({ image: "https://lh3.example/avatar.png" }),
    })

    await database.insert("identities", {
      organizationId: "org",
      personId: testOwner,
      provider: "auth",
      externalId: "user_1",
      name: "Ada Lovelace",
    })

    const document = table()
    const summary = await summarizeTableWithOwner(ctx, document)

    expect(summary.ownerName).toBe("Ada Lovelace")
    expect(summary.ownerImage).toBe("https://lh3.example/avatar.png")
  })

  test.each([
    undefined,
    testOwner,
  ])("leaves the name unset for an owner without an identity: %s", async (ownerId) => {
    const { ctx } = databaseContext()
    const summary = await summarizeTableWithOwner(ctx, table({ ownerId }))
    expect(summary.ownerName).toBeUndefined()
  })
})
