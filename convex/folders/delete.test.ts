import { expect, test, vi } from "vitest"
import { tableDoc, testOwner } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { automationDoc, fileDoc, folderDoc } from "../../test/convex/folders"
import { type Id } from "../_generated/dataModel"
import { removeFolder } from "./records"

// Deleting a folder deletes its whole subtree. Everything filed anywhere
// inside either follows the deleted folder's parent or dies with the
// folders, depending on what the deleting person asked for.

function deletionContext() {
  const storage = { delete: vi.fn(async () => undefined) }
  const scheduler = {
    runAfter: vi.fn(async () => undefined),
    cancel: vi.fn(async () => undefined),
  }

  return { ...databaseContext({ scheduler, storage }), scheduler, storage }
}

async function seedFiledResources(
  database: ReturnType<typeof databaseContext>["database"],
  folderId: string
) {
  return {
    collectionId: await database.insert("collections", tableDoc({ folderId })),
    fileId: await database.insert("files", fileDoc({ folderId })),
    automationId: await database.insert(
      "automations",
      automationDoc({
        folderId,
        trigger: { expression: "0 9 * * *", timezone: "UTC", functionId: "s1" },
      })
    ),
  }
}

async function remove(
  ctx: ReturnType<typeof deletionContext>["ctx"],
  folderId: string,
  deleteResources = false
) {
  await removeFolder(ctx, {
    organizationId: "org",
    folderId: folderId as Id<"folders">,
    deleteResources,
  })
}

test("deleting takes every subfolder and lifts the contents to the parent", async () => {
  const { database, ctx } = deletionContext()
  const parentId = await database.insert("folders", folderDoc())
  const folderId = await database.insert("folders", folderDoc({ parentId }))
  const childId = await database.insert(
    "folders",
    folderDoc({ parentId: folderId })
  )
  const grandchildId = await database.insert(
    "folders",
    folderDoc({ parentId: childId })
  )
  const seeded = await seedFiledResources(database, folderId)
  const deepFileId = await database.insert(
    "files",
    fileDoc({ folderId: grandchildId })
  )

  await remove(ctx, folderId)

  expect(await database.get(folderId)).toBeNull()
  expect(await database.get(childId)).toBeNull()
  expect(await database.get(grandchildId)).toBeNull()
  expect((await database.get(seeded.collectionId))?.folderId).toBe(parentId)
  expect((await database.get(seeded.fileId))?.folderId).toBe(parentId)
  expect((await database.get(seeded.automationId))?.folderId).toBe(parentId)
  expect((await database.get(deepFileId))?.folderId).toBe(parentId)
})

test("deleting a root folder leaves the contents unfiled", async () => {
  const { database, ctx } = deletionContext()
  const folderId = await database.insert("folders", folderDoc())
  const childId = await database.insert(
    "folders",
    folderDoc({ parentId: folderId })
  )
  const seeded = await seedFiledResources(database, childId)

  await remove(ctx, folderId)

  expect(await database.get(childId)).toBeNull()
  expect((await database.get(seeded.collectionId))?.folderId).toBeUndefined()
  expect((await database.get(seeded.fileId))?.folderId).toBeUndefined()
  expect((await database.get(seeded.automationId))?.folderId).toBeUndefined()
})

test("refiling does not touch a resource's updatedAt", async () => {
  const { database, ctx } = deletionContext()
  const folderId = await database.insert("folders", folderDoc())
  const seeded = await seedFiledResources(database, folderId)

  await remove(ctx, folderId)

  expect((await database.get(seeded.collectionId))?.updatedAt).toBe(1)
  expect((await database.get(seeded.fileId))?.updatedAt).toBe(1)
})

test("a destination that was itself deleted falls back to the root", async () => {
  const { database, ctx } = deletionContext()
  const parentId = await database.insert("folders", folderDoc())
  const folderId = await database.insert("folders", folderDoc({ parentId }))
  const seeded = await seedFiledResources(database, folderId)

  await database.delete(parentId)
  await remove(ctx, folderId)

  expect((await database.get(seeded.collectionId))?.folderId).toBeUndefined()
  expect((await database.get(seeded.fileId))?.folderId).toBeUndefined()
})

test("deleting the contents purges each resource through its own domain", async () => {
  const { database, ctx, scheduler, storage } = deletionContext()
  const folderId = await database.insert("folders", folderDoc())
  const childId = await database.insert(
    "folders",
    folderDoc({ parentId: folderId })
  )
  const seeded = await seedFiledResources(database, childId)
  const documentId = await database.insert("documents", {
    collectionId: seeded.collectionId,
    value: { title: "Lead" },
  })
  const collectionShareId = await database.insert("shares", {
    organizationId: "org",
    createdBy: testOwner,
    secret: "a",
    createdAt: 1,
    expiresAt: 2,
    targetKind: "table",
    targetId: seeded.collectionId,
  })
  const fileShareId = await database.insert("shares", {
    organizationId: "org",
    createdBy: testOwner,
    secret: "b",
    createdAt: 1,
    expiresAt: 2,
    targetKind: "file",
    targetId: seeded.fileId,
  })
  // Filed in the same folder as its owner: the sweep must survive reaching
  // a row its owner's removal already took.
  const ownedAutomationId = await database.insert(
    "automations",
    automationDoc({
      folderId: childId,
      parentId: seeded.automationId,
      type: "once",
    })
  )

  await remove(ctx, folderId, true)

  expect(await database.get(seeded.collectionId)).toBeNull()
  expect(await database.get(documentId)).toBeNull()
  expect(await database.get(collectionShareId)).toBeNull()
  expect(await database.get(seeded.fileId)).toBeNull()
  expect(await database.get(fileShareId)).toBeNull()
  expect(storage.delete).toHaveBeenCalledWith("storage:1")
  expect(await database.get(seeded.automationId)).toBeNull()
  expect(await database.get(ownedAutomationId)).toBeNull()
  expect(scheduler.cancel).toHaveBeenCalledWith("s1")
})

test("an overfull subtree continues through the scheduler", async () => {
  const { database, ctx, scheduler } = deletionContext()
  const folderId = await database.insert("folders", folderDoc())
  const childId = await database.insert(
    "folders",
    folderDoc({ parentId: folderId })
  )

  for (let index = 0; index < 201; index += 1) {
    await database.insert("files", fileDoc({ folderId: childId }))
  }

  await remove(ctx, folderId)

  const remaining = await database
    .query("files")
    .withIndex("by_folder", (index) => index.eq("folderId", childId))
    .collect()

  // The pass stops mid-folder, so the child row outlives its own contents
  // and the rescheduled pass still reaches them from the root's id.
  expect(remaining).toHaveLength(1)
  expect(await database.get(childId)).not.toBeNull()
  expect(scheduler.runAfter).toHaveBeenCalledWith(0, expect.anything(), {
    organizationId: "org",
    folderId,
    parentId: undefined,
    deleteResources: false,
  })
})
