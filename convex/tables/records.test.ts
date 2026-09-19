import { describe, expect, test } from "vitest"
import { type TableColumn } from "../../contracts/tables/columns"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import {
  type TableOverrides,
  tableDoc,
  testOwner,
} from "../../test/convex/materials/collections"
import { type Id } from "../_generated/dataModel"
import { planColumnChange, scrubBatch } from "./records"

const principal = { organizationId: "org", personId: testOwner }
const titleColumn: TableColumn = { id: "title", name: "Title", type: "string" }
const countColumn: TableColumn = { id: "count", name: "Count", type: "integer" }

async function seedTable(
  database: TestDatabase,
  overrides: TableOverrides = {}
) {
  const tableId = await database.insert(
    "collections",
    tableDoc({ columns: [titleColumn, countColumn], ...overrides })
  )

  return tableId as Id<"collections">
}

describe("planColumnChange", () => {
  test("collects removed column ids for the scrub", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await seedTable(database)

    const plan = await planColumnChange(ctx, {
      ...principal,
      tableId,
      columns: [titleColumn],
    })

    expect(plan.removed).toEqual(["count"])
    expect(plan.next).toEqual([titleColumn])
  })

  test("required toggles on only when every row holds a value", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await seedTable(database, { documentCount: 2 })

    await database.insert("documents", {
      collectionId: tableId,
      value: { title: "a", count: 1 },
      version: 1,
    })
    await database.insert("documents", {
      collectionId: tableId,
      value: { title: "b" },
      version: 1,
    })

    await expect(
      planColumnChange(ctx, {
        ...principal,
        tableId,
        columns: [titleColumn, { ...countColumn, required: true }],
      })
    ).rejects.toThrow("Every row needs a value for Count")

    // Title is filled everywhere, so it may become required.
    const plan = await planColumnChange(ctx, {
      ...principal,
      tableId,
      columns: [{ ...titleColumn, required: true }, countColumn],
    })

    expect(plan.removed).toEqual([])
  })
})

describe("planColumnChange with new required columns", () => {
  test("a new column starts required only while the table is empty", async () => {
    const { database, ctx } = databaseContext()
    const emptyId = await seedTable(database)
    const owner = { name: "Owner", type: "string", required: true }

    const plan = await planColumnChange(ctx, {
      ...principal,
      tableId: emptyId,
      columns: [titleColumn, countColumn, owner],
    })

    expect(plan.next[2]).toMatchObject({ name: "Owner", required: true })

    const filledId = await seedTable(database)

    await database.insert("documents", {
      collectionId: filledId,
      value: { title: "a" },
      version: 1,
    })
    await expect(
      planColumnChange(ctx, {
        ...principal,
        tableId: filledId,
        columns: [titleColumn, countColumn, owner],
      })
    ).rejects.toThrow("Every row needs a value for Owner")
  })

  test("refuses the required check past the row-count cap", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await seedTable(database, { documentCount: 5000 })

    await expect(
      planColumnChange(ctx, {
        ...principal,
        tableId,
        columns: [{ ...titleColumn, required: true }, countColumn],
      })
    ).rejects.toThrow("up to 1000 rows")
  })
})

describe("scrubBatch", () => {
  test("strips deleted column values and leaves clean rows alone", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await seedTable(database)
    const dirty = await database.insert("documents", {
      collectionId: tableId,
      value: { title: "a", count: 4 },
      version: 1,
      updatedAt: 1,
    })
    const clean = await database.insert("documents", {
      collectionId: tableId,
      value: { title: "b" },
      version: 1,
      updatedAt: 1,
    })

    const next = await scrubBatch(ctx, { tableId, columnIds: ["count"] })

    expect(next).toBeNull()
    expect((await database.get(dirty))?.value).toEqual({ title: "a" })
    // Rows without the column are not rewritten.
    expect((await database.get(clean))?.updatedAt).toBe(1)
  })
})
