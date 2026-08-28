import { describe, expect, test } from "vitest"
import { storeDoc, tableDoc, testOwner } from "../../test/convex/collections"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { type Id } from "../_generated/dataModel"
import { tableSpec } from "../tables/spec"
import {
  accessibleCollection,
  canAccessCollection,
  searchCollections,
} from "./access"
import { type CollectionDoc } from "./spec"

const other = "persons:other" as Id<"persons">

function collection(overrides: Record<string, unknown> = {}) {
  return tableDoc({ name: "Launch tracker", ...overrides }) as CollectionDoc
}

async function insertCollections(database: TestDatabase) {
  await database.insert("collections", collection())
  await database.insert(
    "collections",
    collection({ name: "Owner notes", scope: "personal" })
  )
  await database.insert(
    "collections",
    collection({ name: "Old launch", archivedAt: 5 })
  )
  await database.insert("collections", storeDoc({ name: "Launch value" }))
}

describe("canAccessCollection", () => {
  test("organization collections are visible to every member", () => {
    expect(canAccessCollection(collection(), other)).toBe(true)
  })

  test("personal collections are visible only to their owner", () => {
    const personal = collection({ scope: "personal" })

    expect(canAccessCollection(personal, testOwner)).toBe(true)
    expect(canAccessCollection(personal, other)).toBe(false)
  })
})

describe("accessibleCollection", () => {
  const args = {
    organizationId: "org",
    personId: other,
    kind: "table" as const,
  }

  test("null for missing, foreign, invisible, and wrong-kind alike", () => {
    expect(accessibleCollection(null, args)).toBeNull()
    expect(
      accessibleCollection(collection({ organizationId: "elsewhere" }), args)
    ).toBeNull()
    expect(
      accessibleCollection(collection({ scope: "personal" }), args)
    ).toBeNull()
    expect(
      accessibleCollection(
        storeDoc({ name: "Launch tracker" }) as CollectionDoc,
        args
      )
    ).toBeNull()
  })

  test("returns visible collections unchanged", () => {
    const visible = collection()

    expect(accessibleCollection(visible, args)).toBe(visible)
  })
})

describe("searchCollections", () => {
  const base = { organizationId: "org" }

  test("hides other kinds, foreign personal collections, and archived ones", async () => {
    const { database, ctx } = databaseContext()

    await insertCollections(database)

    const found = await searchCollections(ctx, tableSpec, {
      ...base,
      personId: other,
    })

    expect(found.map((entry) => entry.name)).toEqual(["Launch tracker"])
  })

  test("owners see their personal collections", async () => {
    const { database, ctx } = databaseContext()

    await insertCollections(database)

    const found = await searchCollections(ctx, tableSpec, {
      ...base,
      personId: testOwner,
    })

    expect(found.map((entry) => entry.name)).toEqual([
      "Launch tracker",
      "Owner notes",
    ])
  })

  test("matches name substrings case-insensitively and honors limits", async () => {
    const { database, ctx } = databaseContext()

    await insertCollections(database)

    const found = await searchCollections(ctx, tableSpec, {
      ...base,
      personId: testOwner,
      query: "LAUNCH",
      includeArchived: true,
      limit: 1,
    })

    expect(found.map((entry) => entry.name)).toEqual(["Launch tracker"])
  })
})
