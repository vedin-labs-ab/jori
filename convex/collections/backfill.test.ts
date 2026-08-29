import { expect, test } from "vitest"
import { storeDoc, tableDoc } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { backfillBatch } from "./backfill"

function documentDoc(collectionId: string) {
  return { collectionId, value: {}, version: 1, createdAt: 1, updatedAt: 1 }
}

test("stamps every collection with its counted documents", async () => {
  const { database, ctx } = databaseContext()
  const tableId = await database.insert("collections", tableDoc())
  const storeId = await database.insert("collections", storeDoc())

  await database.insert("documents", documentDoc(tableId))
  await database.insert("documents", documentDoc(tableId))
  await database.insert("documents", documentDoc(storeId))

  const cursor = await backfillBatch(ctx, null)

  expect(cursor).toBeNull()
  expect((await database.get(tableId))?.documentCount).toBe(2)
  expect((await database.get(storeId))?.documentCount).toBe(1)
})

test("a collection without documents stamps an explicit zero", async () => {
  const { database, ctx } = databaseContext()
  const tableId = await database.insert("collections", tableDoc())

  await backfillBatch(ctx, null)

  expect((await database.get(tableId))?.documentCount).toBe(0)
})
