import { expect, test } from "vitest"
import { tableDoc } from "../../../test/convex/collections"
import { databaseContext } from "../../../test/convex/database"
import { fileDoc } from "../../../test/convex/folders"
import { type Id } from "../../_generated/dataModel"
import { createSight } from "../../visibility/sight"
import { normalizeConsoleReference, normalizeConsoleReferences } from "./create"

const other = "persons:other" as Id<"persons">

async function seed() {
  const { database, ctx } = databaseContext()
  const tableId = await database.insert(
    "collections",
    tableDoc({ name: "Customer renewals" })
  )
  const secretId = await database.insert(
    "files",
    fileDoc({ name: "secret.csv", visibility: { mode: "private" } })
  )
  const sight = createSight(ctx, { organizationId: "org", personId: other })

  return { ctx, secretId, sight, tableId }
}

test("a reference's id is kept only in its kind's own table", async () => {
  const { ctx, tableId } = await seed()

  expect(
    normalizeConsoleReference(ctx, { kind: "table", id: tableId })
  ).toEqual({
    kind: "table",
    id: tableId,
  })
  expect(normalizeConsoleReference(ctx, { kind: "job", id: "nope" })).toBeNull()
})

test("a message's mentions are kept once each, in their own tables, and only when the sender can see them", async () => {
  const { ctx, secretId, sight, tableId } = await seed()

  expect(
    await normalizeConsoleReferences(ctx, sight, [
      { kind: "table", id: tableId },
      { kind: "table", id: tableId },
    ])
  ).toEqual([{ kind: "table", id: tableId, name: "Customer renewals" }])
  await expect(
    normalizeConsoleReferences(ctx, sight, [{ kind: "file", id: secretId }])
  ).rejects.toThrow("The mentioned file is not available.")
  await expect(
    normalizeConsoleReferences(ctx, sight, [{ kind: "job", id: "not-an-id" }])
  ).rejects.toThrow("The mentioned job is not available.")
})
