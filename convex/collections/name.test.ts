import { expect, test } from "vitest"
import { storeDoc, tableDoc, testOwner } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { folderDoc } from "../../test/convex/folders"
import { type Id } from "../_generated/dataModel"
import { newCollectionName } from "./name"

const viewer = { organizationId: "org", personId: testOwner }
test.each(["table", "store"] as const)(
  "automatic %s names avoid visible peers without exposing private names",
  async (kind) => {
    const { database, ctx } = databaseContext()
    const fixture = kind === "table" ? tableDoc : storeDoc
    await database.insert("collections", fixture({ name: `New ${kind}` }))
    await database.insert(
      "collections",
      fixture({
        name: `New ${kind} 1`,
        visibility: { mode: "private" },
        ownerId: "persons:other" as Id<"persons">,
      })
    )
    expect(await newCollectionName(ctx, viewer, kind)).toBe(`New ${kind} 1`)
    await database.insert("collections", fixture({ name: `New ${kind} 1` }))
    expect(await newCollectionName(ctx, viewer, kind)).toBe(`New ${kind} 2`)
  }
)

test("automatic names stay within the target folder and ignore archived items", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await database.insert("folders", folderDoc())
  await database.insert("collections", tableDoc({ name: "New table" }))
  await database.insert(
    "collections",
    tableDoc({ name: "New table", folderId, archivedAt: 5 })
  )
  await database.insert(
    "collections",
    tableDoc({ name: "New table", organizationId: "other", folderId })
  )
  expect(await newCollectionName(ctx, { ...viewer, folderId }, "table")).toBe(
    "New table"
  )
  await database.insert(
    "collections",
    tableDoc({ name: "New table", folderId })
  )
  expect(await newCollectionName(ctx, { ...viewer, folderId }, "table")).toBe(
    "New table 1"
  )
})
