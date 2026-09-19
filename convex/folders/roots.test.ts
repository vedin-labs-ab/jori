import { expect, test } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import {
  storeDoc,
  tableDoc,
  testOwner,
} from "../../test/convex/materials/collections"
import { fileDoc, folderDoc, jobDoc } from "../../test/convex/materials/folders"
import { type Id } from "../_generated/dataModel"
import { folderResources } from "./resources"

const other = "persons:other" as Id<"persons">
async function seedRoot(database: TestDatabase) {
  const folderId = await database.insert("folders", folderDoc())
  await database.insert("files", fileDoc({ folderId, name: "Filed elsewhere" }))
  await database.insert("collections", tableDoc({ name: "Root table" }))
  await database.insert("collections", storeDoc({ name: "Root store" }))
  await database.insert("files", fileDoc({ name: "Root file" }))
  await database.insert("jobs", jobDoc({ name: "Root job" }))
  await database.insert("conversations", {
    organizationId: "org",
    surface: "console",
    title: "Root chat",
    visibility: { mode: "organization" },
    createdBy: testOwner,
  })
  await seedHidden(database)
}

async function seedHidden(database: TestDatabase) {
  await database.insert(
    "collections",
    tableDoc({ name: "Archived", archivedAt: 1 })
  )
  await database.insert(
    "files",
    fileDoc({ name: "Private", visibility: { mode: "private" } })
  )
  await database.insert("conversations", {
    organizationId: "org",
    surface: "console",
    title: "Private chat",
    visibility: { mode: "private" },
    createdBy: testOwner,
  })
  await database.insert("conversations", {
    organizationId: "org",
    surface: "slack",
    title: "External chat",
    visibility: { mode: "organization" },
    createdBy: testOwner,
  })
  for (const [table, doc] of [
    ["collections", tableDoc()],
    ["files", fileDoc()],
    ["jobs", jobDoc()],
    [
      "conversations",
      {
        surface: "console",
        title: "Other org",
        visibility: { mode: "organization" },
        createdBy: testOwner,
      },
    ],
  ] as const) {
    await database.insert(table, { ...doc, organizationId: "other-org" })
  }
}

test("the root lists visible unfiled resources but excludes chats for every viewer", async () => {
  const { database, ctx } = databaseContext()
  await seedRoot(database)
  const args = { organizationId: "org", folderId: undefined }
  const resources = await folderResources(ctx, { ...args, personId: other })
  expect(resources.map((row) => [row.type, row.name])).toEqual([
    ["file", "Root file"],
    ["job", "Root job"],
    ["store", "Root store"],
    ["table", "Root table"],
  ])
  const owned = await folderResources(ctx, { ...args, personId: testOwner })
  expect(owned.map((row) => row.name)).toContain("Private")
  expect(owned.some((row) => row.type === "chat")).toBe(false)
})
