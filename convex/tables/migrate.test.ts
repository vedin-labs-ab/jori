import { expect, test } from "vitest"
import { storeDoc, tableDoc } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { migrateStep } from "./migrate"

test("stamps hidden ids from legacy keys, leaving stamped tables alone", async () => {
  const { database, ctx } = databaseContext()
  const legacy = await database.insert(
    "collections",
    tableDoc({
      columns: [
        { key: "title", name: "Title", type: "string", required: true },
      ],
    })
  )
  const stamped = await database.insert(
    "collections",
    tableDoc({ columns: [{ id: "c_1", name: "Count", type: "integer" }] })
  )

  await database.insert("collections", storeDoc())

  const next = await migrateStep(ctx, undefined)

  expect(next).toBeNull()
  expect((await database.get(legacy))?.columns).toEqual([
    { id: "title", name: "Title", type: "string", required: true },
  ])
  expect((await database.get(stamped))?.columns).toEqual([
    { id: "c_1", name: "Count", type: "integer" },
  ])
})
