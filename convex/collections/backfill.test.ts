import { expect, test } from "vitest"
import { storeDoc, tableDoc } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { type BackfillStep, backfillStep } from "./backfill"

function documentDoc(collectionId: string) {
  return { collectionId, value: {}, version: 1, createdAt: 1, updatedAt: 1 }
}

/** Drives the self-rescheduling steps the way the scheduler would. */
async function runBackfill(ctx: Parameters<typeof backfillStep>[0]) {
  let step: BackfillStep | null = {}
  let guard = 0

  while (step !== null) {
    if (guard++ > 50) {
      throw new Error("Backfill did not terminate.")
    }

    step = await backfillStep(ctx, step)
  }
}

test("stamps every collection with its counted documents", async () => {
  const { database, ctx } = databaseContext()
  const tableId = await database.insert("collections", tableDoc())
  const storeId = await database.insert("collections", storeDoc())

  await database.insert("documents", documentDoc(tableId))
  await database.insert("documents", documentDoc(tableId))
  await database.insert("documents", documentDoc(storeId))

  await runBackfill(ctx)

  expect((await database.get(tableId))?.documentCount).toBe(2)
  expect((await database.get(storeId))?.documentCount).toBe(1)
})

test("a collection without documents stamps an explicit zero", async () => {
  const { database, ctx } = databaseContext()
  const tableId = await database.insert("collections", tableDoc())

  await runBackfill(ctx)

  expect((await database.get(tableId))?.documentCount).toBe(0)
})

test("a mid-count step resumes past already-counted documents", async () => {
  const { database, ctx } = databaseContext()
  const tableId = await database.insert("collections", tableDoc())
  await database.insert("documents", documentDoc(tableId))
  const second = await database.insert("documents", documentDoc(tableId))
  const secondTime = (await database.get(second))?._creationTime as number

  // Resume as if the first document had already been counted.
  const step = await backfillStep(ctx, {
    collectionId: tableId as never,
    after: secondTime - 1,
    counted: 5,
  })

  expect(step).toEqual({})
  expect((await database.get(tableId))?.documentCount).toBe(6)
})

test("a vanished mid-count collection resets without stamping elsewhere", async () => {
  const { database, ctx } = databaseContext()
  const goneId = await database.insert("collections", tableDoc())
  const stayId = await database.insert("collections", storeDoc())
  await database.delete(goneId)

  // The stale running count must not leak onto the next collection.
  const step = await backfillStep(ctx, {
    collectionId: goneId as never,
    counted: 3,
  })

  expect(step).toEqual({})
  expect((await database.get(stayId))?.documentCount).toBeUndefined()

  const next = await backfillStep(ctx, step ?? {})

  expect(next).toEqual({})
  expect((await database.get(stayId))?.documentCount).toBe(0)
})

test("an already-stamped collection is not restamped", async () => {
  const { database, ctx } = databaseContext()
  await database.insert("collections", { ...tableDoc(), documentCount: 9 })

  const step = await backfillStep(ctx, {})

  expect(step).toBeNull()
})
