import { expect, test } from "vitest"
import {
  ownerIdentityDoc,
  storeDoc,
  tableDoc,
  testOwner,
} from "../../test/convex/collections"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { fileDoc, folderDoc, jobDoc } from "../../test/convex/folders"
import { type Doc, type Id } from "../_generated/dataModel"
import { folderChildren, folderResources, summarizeTree } from "./contents"

const other = "persons:other" as Id<"persons">

async function seedFolder(database: TestDatabase) {
  const folderId = await database.insert("folders", folderDoc())

  await database.insert("collections", tableDoc({ folderId, name: "Leads" }))
  await database.insert("collections", storeDoc({ folderId, name: "Config" }))
  await database.insert("files", fileDoc({ folderId, name: "costs.csv" }))
  await database.insert(
    "jobs",
    jobDoc({ folderId, name: "Digest", status: "paused" })
  )

  return folderId
}

test("subfolders come back name-sorted, counting their direct children", async () => {
  const { database, ctx } = databaseContext()
  // Parent resources must never inflate a child folder's counts.
  const folderId = await seedFolder(database)

  const zetaId = await database.insert(
    "folders",
    folderDoc({ parentId: folderId, name: "Zeta" })
  )
  const alphaId = await database.insert(
    "folders",
    folderDoc({ parentId: folderId, name: "Alpha" })
  )

  await database.insert(
    "folders",
    folderDoc({ parentId: folderId, name: "Empty" })
  )
  // Zeta holds only a subfolder, Alpha only filed resources: both count
  // and mark a child folder on their own. Deeper content stays out — Deep's
  // own children would not affect Zeta's number.
  await database.insert(
    "folders",
    folderDoc({ parentId: zetaId, name: "Deep" })
  )
  await database.insert("files", fileDoc({ folderId: alphaId }))
  await database.insert("files", fileDoc({ folderId: alphaId, name: "b.txt" }))

  const children = await folderChildren(ctx, {
    organizationId: "org",
    personId: other,
    parentId: folderId,
  })

  expect(
    children.map((child) => [
      child.name,
      child.folderCount,
      child.resourceCount,
      child.hasContents,
    ])
  ).toEqual([
    ["Alpha", 0, 2, true],
    ["Empty", 0, 0, false],
    ["Zeta", 1, 0, true],
  ])
})

test("root folders list the same way when no parent is given", async () => {
  const { database, ctx } = databaseContext()
  const rootId = await database.insert("folders", folderDoc({ name: "Docs" }))

  await database.insert("folders", folderDoc({ parentId: rootId }))
  await database.insert("files", fileDoc({ folderId: rootId }))

  const roots = await folderChildren(ctx, {
    organizationId: "org",
    personId: other,
    parentId: undefined,
  })

  expect(
    roots.map((root) => [root.name, root.folderCount, root.resourceCount])
  ).toEqual([["Docs", 1, 1]])
})

test("child counts skip what the viewer cannot see", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await database.insert("folders", folderDoc())
  const childId = await database.insert(
    "folders",
    folderDoc({ parentId: folderId, name: "Mine" })
  )

  await database.insert(
    "files",
    fileDoc({
      folderId: childId,
      name: "private.txt",
      visibility: { mode: "private" },
    })
  )
  await database.insert(
    "collections",
    tableDoc({ folderId: childId, name: "Old leads", archivedAt: 5 })
  )

  const view = { organizationId: "org", parentId: folderId }
  const forOwner = await folderChildren(ctx, { ...view, personId: testOwner })
  const forOther = await folderChildren(ctx, { ...view, personId: other })

  // The owner counts the personal file; nobody counts the archived table.
  expect(forOwner.find((child) => child.name === "Mine")).toMatchObject({
    resourceCount: 1,
    hasContents: true,
  })
  expect(forOther.find((child) => child.name === "Mine")).toMatchObject({
    resourceCount: 0,
    hasContents: false,
  })
})

test("restricted subfolders drop out of the listing for excluded viewers", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await database.insert("folders", folderDoc())

  await database.insert(
    "folders",
    folderDoc({
      parentId: folderId,
      name: "Leadership",
      visibility: { mode: "people", personIds: [testOwner] },
    })
  )

  const view = { organizationId: "org", parentId: folderId }
  const forOwner = await folderChildren(ctx, { ...view, personId: testOwner })
  const forOther = await folderChildren(ctx, { ...view, personId: other })

  expect(forOwner.map((child) => child.name)).toContain("Leadership")
  expect(forOther.map((child) => child.name)).not.toContain("Leadership")
})

test("a folder's visibility cascades over its filed resources", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await database.insert(
    "folders",
    folderDoc({ visibility: { mode: "private" }, createdBy: testOwner })
  )

  await database.insert(
    "collections",
    tableDoc({ folderId, name: "Shared inside" })
  )

  const view = { organizationId: "org", folderId }
  const forOwner = await folderResources(ctx, { ...view, personId: testOwner })
  const forOther = await folderResources(ctx, { ...view, personId: other })

  // The table itself is organization-wide, yet the only-me folder hides it
  // from everyone but the folder's creator (who also owns the table here).
  expect(forOwner.map((resource) => resource.name)).toContain("Shared inside")
  expect(forOther).toEqual([])
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
    ["job", "Digest"],
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
    tableDoc({
      folderId,
      name: "Private notes",
      visibility: { mode: "private" },
    })
  )
  await database.insert(
    "files",
    fileDoc({
      folderId,
      name: "private.txt",
      visibility: { mode: "private" },
    })
  )
  await database.insert(
    "jobs",
    jobDoc({
      folderId,
      name: "Private digest",
      visibility: { mode: "private" },
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

test("listed rows carry their owner, and none for what Jori owns", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await seedFolder(database)

  const runFile = fileDoc({ folderId, name: "run.md", ownerId: undefined })

  await database.insert("identities", ownerIdentityDoc())
  await database.insert("folders", folderDoc({ parentId: folderId, name: "A" }))
  await database.insert("files", runFile)

  const view = { organizationId: "org", personId: other }
  const children = await folderChildren(ctx, { ...view, parentId: folderId })
  const resources = await folderResources(ctx, { ...view, folderId })

  // A subfolder belongs to whoever created it and a filed resource to its
  // owner; a file an agent run saved has none, a job never has one.
  expect(
    [children[0], ...resources].map((row) => [
      row?.name,
      row?.ownerId,
      row?.ownerName,
    ])
  ).toEqual([
    ["A", testOwner, "Ada Lovelace"],
    ["Config", testOwner, "Ada Lovelace"],
    ["costs.csv", testOwner, "Ada Lovelace"],
    ["Digest", undefined, undefined],
    ["Leads", testOwner, "Ada Lovelace"],
    ["run.md", undefined, undefined],
  ])
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

test("tree rows mark the folders that hold anything", async () => {
  const { database, ctx } = databaseContext()
  const parentId = await database.insert("folders", folderDoc({ name: "Docs" }))

  await database.insert("folders", folderDoc({ name: "Child", parentId }))

  const filedId = await database.insert("folders", folderDoc({ name: "Data" }))

  await database.insert("files", fileDoc({ folderId: filedId }))
  await database.insert("folders", folderDoc({ name: "Empty" }))

  const folders = (await database
    .query("folders")
    .collect()) as Doc<"folders">[]
  const rows = await summarizeTree(ctx, folders)

  expect(rows.map((row) => [row.name, row.hasContents])).toEqual([
    ["Docs", true],
    ["Child", false],
    ["Data", true],
    ["Empty", false],
  ])
})
