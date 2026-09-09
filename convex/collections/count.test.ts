import { expect, test } from "vitest"
import { tableDoc } from "../../test/convex/collections"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { tableSpec } from "../tables/spec"
import { deleteDocument, insertDocuments } from "./documents"
import { type CollectionDoc } from "./spec"

// The denormalized documentCount only ever moves inside the document write
// chokepoint; these tests pin it to every way cardinality can change.

async function createTable(database: TestDatabase) {
  const tableId = await database.insert(
    "collections",
    tableDoc({ columns: [{ id: "title", name: "Title", type: "string" }] })
  )

  return (await database.get(tableId)) as unknown as CollectionDoc<"table">
}

test("inserts increment, batches by their size, deletes decrement", async () => {
  const { database, ctx } = databaseContext()
  const table = await createTable(database)
  const [row] = await insertDocuments(ctx, tableSpec, table, [{ title: "One" }])

  expect((await database.get(table._id))?.documentCount).toBe(1)

  await insertDocuments(ctx, tableSpec, table, [
    { title: "Two" },
    { title: "Three" },
  ])

  expect((await database.get(table._id))?.documentCount).toBe(3)

  if (row === undefined) {
    throw new Error("Row insert failed.")
  }

  await deleteDocument(ctx, tableSpec, table, { documentId: row._id })

  expect((await database.get(table._id))?.documentCount).toBe(2)
})

test("a rejected batch writes neither documents nor their counter", async () => {
  const { database, ctx } = databaseContext()
  const table = await createTable(database)

  await expect(
    insertDocuments(ctx, tableSpec, table, [{ title: "ok" }, { title: 4 }])
  ).rejects.toThrow("must be string")

  expect(await database.query("documents").collect()).toEqual([])
  expect((await database.get(table._id))?.documentCount).toBeUndefined()
})
