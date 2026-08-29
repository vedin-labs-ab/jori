import { expect, test, vi } from "vitest"
import { tableDoc } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { automationDoc, fileDoc, folderDoc } from "../../test/convex/folders"
import { type Id } from "../_generated/dataModel"
import { removeFolder } from "./records"

// Deleting a folder reparents everything it held — child folders and each
// filed resource type — to the deleted folder's parent, or to the root.

async function seedFiledResources(
  database: ReturnType<typeof databaseContext>["database"],
  folderId: string
) {
  return {
    collectionId: await database.insert("collections", tableDoc({ folderId })),
    fileId: await database.insert("files", fileDoc({ folderId })),
    automationId: await database.insert(
      "automations",
      automationDoc({ folderId })
    ),
  }
}

test("deleting moves children and filed resources to the parent", async () => {
  const { database, ctx } = databaseContext()
  const parentId = await database.insert("folders", folderDoc())
  const folderId = await database.insert("folders", folderDoc({ parentId }))
  const childId = await database.insert(
    "folders",
    folderDoc({ parentId: folderId })
  )
  const seeded = await seedFiledResources(database, folderId)

  await removeFolder(ctx, {
    organizationId: "org",
    folderId: folderId as Id<"folders">,
  })

  expect(await database.get(folderId)).toBeNull()
  expect((await database.get(childId))?.parentId).toBe(parentId)
  expect((await database.get(seeded.collectionId))?.folderId).toBe(parentId)
  expect((await database.get(seeded.fileId))?.folderId).toBe(parentId)
  expect((await database.get(seeded.automationId))?.folderId).toBe(parentId)
})

test("deleting a root folder unfiles to the root", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await database.insert("folders", folderDoc())
  const childId = await database.insert(
    "folders",
    folderDoc({ parentId: folderId })
  )
  const seeded = await seedFiledResources(database, folderId)

  await removeFolder(ctx, {
    organizationId: "org",
    folderId: folderId as Id<"folders">,
  })

  expect((await database.get(childId))?.parentId).toBeUndefined()
  expect((await database.get(seeded.collectionId))?.folderId).toBeUndefined()
  expect((await database.get(seeded.fileId))?.folderId).toBeUndefined()
  expect((await database.get(seeded.automationId))?.folderId).toBeUndefined()
})

test("filing does not touch a resource's updatedAt", async () => {
  const { database, ctx } = databaseContext()
  const folderId = await database.insert("folders", folderDoc())
  const seeded = await seedFiledResources(database, folderId)

  await removeFolder(ctx, {
    organizationId: "org",
    folderId: folderId as Id<"folders">,
  })

  expect((await database.get(seeded.collectionId))?.updatedAt).toBe(1)
  expect((await database.get(seeded.fileId))?.updatedAt).toBe(1)
})

test("a destination that was itself deleted falls back to the root", async () => {
  const { database, ctx } = databaseContext()
  const parentId = await database.insert("folders", folderDoc())
  const folderId = await database.insert("folders", folderDoc({ parentId }))
  const childId = await database.insert(
    "folders",
    folderDoc({ parentId: folderId })
  )
  const seeded = await seedFiledResources(database, folderId)

  await database.delete(parentId)
  await removeFolder(ctx, {
    organizationId: "org",
    folderId: folderId as Id<"folders">,
  })

  expect((await database.get(childId))?.parentId).toBeUndefined()
  expect((await database.get(seeded.collectionId))?.folderId).toBeUndefined()
  expect((await database.get(seeded.fileId))?.folderId).toBeUndefined()
})

test("an overfull folder continues through the scheduler", async () => {
  const runAfter = vi.fn(async () => undefined)
  const { database, ctx } = databaseContext({ scheduler: { runAfter } })
  const folderId = await database.insert("folders", folderDoc())

  for (let index = 0; index < 201; index += 1) {
    await database.insert("files", fileDoc({ folderId, name: `f${index}` }))
  }

  await removeFolder(ctx, {
    organizationId: "org",
    folderId: folderId as Id<"folders">,
  })

  const remaining = await database
    .query("files")
    .withIndex("by_folder", (index) => index.eq("folderId", folderId))
    .collect()

  expect(remaining).toHaveLength(1)
  expect(runAfter).toHaveBeenCalledTimes(1)
  expect(runAfter).toHaveBeenCalledWith(0, expect.anything(), {
    organizationId: "org",
    folderId,
    parentId: undefined,
  })
})
