import { describe, expect, test } from "vitest"
import { storeDoc, tableDoc, testOwner } from "../../test/convex/collections"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { type Id } from "../_generated/dataModel"
import { tableSpec } from "../tables/spec"
import { createSight } from "../visibility/sight"
import { accessibleCollection, searchCollections } from "./access"
import { type CollectionDoc } from "./spec"

const other = "persons:other" as Id<"persons">

function collection(overrides: Record<string, unknown> = {}) {
  return tableDoc({ name: "Launch tracker", ...overrides }) as CollectionDoc
}

async function insertCollections(database: TestDatabase) {
  await database.insert("collections", collection())
  await database.insert(
    "collections",
    collection({ name: "Owner notes", visibility: { mode: "private" } })
  )
  await database.insert(
    "collections",
    collection({ name: "Old launch", archivedAt: 5 })
  )
  await database.insert("collections", storeDoc({ name: "Launch value" }))
}

describe("accessibleCollection", () => {
  function sightFor(personId: Id<"persons">) {
    const { ctx } = databaseContext()

    return createSight(ctx, { organizationId: "org", personId })
  }

  test("null for missing, foreign, invisible, and wrong-kind alike", async () => {
    const sight = sightFor(other)

    expect(await accessibleCollection(sight, null, "table")).toBeNull()
    expect(
      await accessibleCollection(
        sight,
        collection({ organizationId: "elsewhere" }),
        "table"
      )
    ).toBeNull()
    expect(
      await accessibleCollection(
        sight,
        collection({ visibility: { mode: "private" } }),
        "table"
      )
    ).toBeNull()
    expect(
      await accessibleCollection(
        sight,
        storeDoc({ name: "Launch tracker" }) as CollectionDoc,
        "table"
      )
    ).toBeNull()
  })

  test("returns visible collections unchanged", async () => {
    const visible = collection()

    expect(await accessibleCollection(sightFor(other), visible, "table")).toBe(
      visible
    )
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
