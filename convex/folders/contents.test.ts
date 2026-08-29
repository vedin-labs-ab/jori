import { expect, test } from "vitest"
import { storeDoc, tableDoc, testOwner } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { automationDoc, fileDoc, folderDoc } from "../../test/convex/folders"
import { type Id } from "../_generated/dataModel"
import { folderChildren, folderResources } from "./contents"

const other = "persons:other" as Id<"persons">

async function seedFolder(
  database: ReturnType<typeof databaseContext>["database"]
) {
  const folderId = (await database.insert(
    "folders",
    folderDoc()
  )) as Id<"folders">

  await database.insert("collections", tableDoc({ folderId, name: "Leads" }))
  await database.insert("collections", storeDoc({ folderId, name: "Config" }))
  await database.insert("files", fileDoc({ folderId, name: "costs.csv" }))
  await database.insert(
    "automations",
    automationDoc({ folderId, name: "Digest", status: "paused" })
  )

  return folderId
}

test("subfolders come back name-sorted", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await seedFolder(database)

  await database.insert(
    "folders",
    folderDoc({ parentId: folderId, name: "Zeta" })
  )
  await database.insert(
    "folders",
    folderDoc({ parentId: folderId, name: "Alpha" })
  )

  const children = await folderChildren(ctx, {
    organizationId: "org",
    folderId,
  })

  expect(children.map((child) => child.name)).toEqual(["Alpha", "Zeta"])
})

test("resources carry their type and display extras, name-sorted", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await seedFolder(database)

  const resources = await folderResources(ctx, {
    organizationId: "org",
    personId: other,
    folderId,
  })

  expect(resources.map((resource) => [resource.type, resource.name])).toEqual([
    ["store", "Config"],
    ["file", "costs.csv"],
    ["automation", "Digest"],
    ["table", "Leads"],
  ])
  expect(resources[1]).toMatchObject({ mimeType: "text/csv", size: 42 })
  expect(resources[2]).toMatchObject({ status: "paused" })
})

test("personal resources appear only for their owner", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await seedFolder(database)

  await database.insert(
    "collections",
    tableDoc({ folderId, name: "Private notes", scope: "personal" })
  )
  await database.insert(
    "files",
    fileDoc({ folderId, name: "private.txt", scope: "personal" })
  )
  await database.insert(
    "automations",
    automationDoc({
      folderId,
      name: "Private digest",
      scope: "personal",
      principal: { kind: "person", personId: testOwner },
    })
  )

  const view = { organizationId: "org", folderId }
  const forOwner = await folderResources(ctx, { ...view, personId: testOwner })
  const forOther = await folderResources(ctx, { ...view, personId: other })

  expect(forOwner).toHaveLength(7)
  expect(forOther).toHaveLength(4)
  expect(forOther.map((resource) => resource.name)).not.toContain("private.txt")
})

test("archived collections stay filed but hidden", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await seedFolder(database)

  await database.insert(
    "collections",
    tableDoc({ folderId, name: "Old leads", archivedAt: 5 })
  )

  const resources = await folderResources(ctx, {
    organizationId: "org",
    personId: other,
    folderId,
  })

  expect(resources.map((resource) => resource.name)).not.toContain("Old leads")
})
