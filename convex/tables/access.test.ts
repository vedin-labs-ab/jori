import { describe, expect, test } from "vitest"
import {
  type TableOverrides,
  tableDoc,
  testOwner,
} from "../../test/convex/collections"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { type CollectionDoc } from "../collections/spec"
import { summarizeTable, summarizeTableWithOwner } from "./access"

async function storedTable(
  database: TestDatabase,
  overrides: TableOverrides = {}
) {
  const tableId = await database.insert("collections", tableDoc(overrides))

  return (await database.get(tableId)) as unknown as CollectionDoc<"table">
}

describe("summarizing a table", () => {
  test("reads a missing document counter as zero", async () => {
    const { database } = databaseContext()
    const table = await storedTable(database)

    expect(summarizeTable(table).rowCount).toBe(0)
  })

  test("carries the maintained document counter", async () => {
    const { database } = databaseContext()
    const table = await storedTable(database, { documentCount: 42 })

    expect(summarizeTable(table).rowCount).toBe(42)
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

    const table = await storedTable(database)
    const summary = await summarizeTableWithOwner(ctx, table)

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

    const table = await storedTable(database)
    const summary = await summarizeTableWithOwner(ctx, table)

    expect(summary.ownerName).toBe("Ada Lovelace")
    expect(summary.ownerImage).toBe("https://lh3.example/avatar.png")
  })

  test("leaves the name unset without an owner", async () => {
    const { database, ctx } = databaseContext()
    const table = await storedTable(database, { ownerId: undefined })
    const summary = await summarizeTableWithOwner(ctx, table)

    expect(summary.ownerName).toBeUndefined()
  })

  test("leaves the name unset when no identity names the owner", async () => {
    const { database, ctx } = databaseContext()
    const table = await storedTable(database)
    const summary = await summarizeTableWithOwner(ctx, table)

    expect(summary.ownerName).toBeUndefined()
  })
})
