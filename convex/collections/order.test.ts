import { afterEach, describe, expect, test, vi } from "vitest"
import { tableDoc } from "../../test/convex/collections"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { tableSpec } from "../tables/spec"
import { insertDocuments, pageDocuments } from "./documents"
import { type CollectionDoc } from "./spec"

async function createTable(database: TestDatabase) {
  const tableId = await database.insert("collections", tableDoc())

  return (await database.get(tableId)) as unknown as CollectionDoc<"table">
}

async function insertRow(
  ctx: Parameters<typeof insertDocuments>[0],
  table: CollectionDoc<"table">,
  title: string,
  anchor?: Parameters<typeof insertDocuments>[4]
) {
  const [row] = await insertDocuments(
    ctx,
    tableSpec,
    table,
    [{ title }],
    anchor
  )

  if (row === undefined) {
    throw new Error("Row insert failed.")
  }

  return row
}

function orderOf(row: { order?: number }) {
  if (row.order === undefined) {
    throw new Error("Row has no order.")
  }

  return row.order
}

afterEach(() => {
  vi.useRealTimers()
})

describe("append ordering", () => {
  test("appends receive increasing orders and read back oldest first", async () => {
    const { database, ctx } = databaseContext()
    const table = await createTable(database)
    const first = await insertRow(ctx, table, "first")
    const second = await insertRow(ctx, table, "second")
    const third = await insertRow(ctx, table, "third")

    expect(orderOf(second)).toBeGreaterThan(orderOf(first))
    expect(orderOf(third)).toBeGreaterThan(orderOf(second))

    const page = await pageDocuments(ctx, table._id, {
      numItems: 10,
      cursor: null,
    })
    expect(page.page.map((row) => row.value)).toEqual([
      { title: "first" },
      { title: "second" },
      { title: "third" },
    ])
  })

  test("a batch inserted in one moment keeps its given order", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)

    const { database, ctx } = databaseContext()
    const table = await createTable(database)
    const rows = await insertDocuments(ctx, tableSpec, table, [
      { title: "a" },
      { title: "b" },
      { title: "c" },
    ])

    expect(orderOf(rows[1])).toBeGreaterThan(orderOf(rows[0]))
    expect(orderOf(rows[2])).toBeGreaterThan(orderOf(rows[1]))
  })
})

describe("windowed paging", () => {
  test("cursors preserve order without gaps across full and partial pages", async () => {
    const { database, ctx } = databaseContext()
    const table = await createTable(database)
    const total = 7

    // Seeded in reverse so the walk proves the index ordering, not luck.
    for (let position = total; position >= 1; position--) {
      await database.insert("documents", {
        collectionId: table._id,
        order: position,
        value: { title: `row ${position}` },
        version: 1,
        createdAt: position,
        updatedAt: position,
      })
    }

    const seen: number[] = []
    let cursor: string | null = null

    for (;;) {
      const page = await pageDocuments(ctx, table._id, {
        numItems: 3,
        cursor,
      })

      expect(page.page.length).toBeLessThanOrEqual(3)
      seen.push(...page.page.map((row) => orderOf(row)))

      if (page.isDone) {
        break
      }

      cursor = page.continueCursor
    }

    expect(seen).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe("anchored inserts", () => {
  test("below takes the midpoint between the anchor and its next row", async () => {
    const { database, ctx } = databaseContext()
    const table = await createTable(database)
    const first = await insertRow(ctx, table, "first")
    const second = await insertRow(ctx, table, "second")
    const between = await insertRow(ctx, table, "between", {
      documentId: first._id,
      placement: "below",
    })

    expect(orderOf(between)).toBeGreaterThan(orderOf(first))
    expect(orderOf(between)).toBeLessThan(orderOf(second))
  })

  test("above the first row lands before everything", async () => {
    const { database, ctx } = databaseContext()
    const table = await createTable(database)
    const first = await insertRow(ctx, table, "first")
    const above = await insertRow(ctx, table, "above", {
      documentId: first._id,
      placement: "above",
    })

    expect(orderOf(above)).toBeLessThan(orderOf(first))
  })

  test("below the last row appends past it", async () => {
    const { database, ctx } = databaseContext()
    const table = await createTable(database)
    await insertRow(ctx, table, "first")
    const last = await insertRow(ctx, table, "last")
    const below = await insertRow(ctx, table, "below", {
      documentId: last._id,
      placement: "below",
    })

    expect(orderOf(below)).toBeGreaterThan(orderOf(last))
  })

  test("an anchor from another table is rejected", async () => {
    const { database, ctx } = databaseContext()
    const table = await createTable(database)
    const other = await createTable(database)
    const foreign = await insertRow(ctx, other, "foreign")

    await expect(
      insertRow(ctx, table, "misplaced", {
        documentId: foreign._id,
        placement: "below",
      })
    ).rejects.toThrow("Row not found.")
  })
})
