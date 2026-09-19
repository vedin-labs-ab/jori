import { expect, test, vi } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { tableDoc, testOwner } from "../../test/convex/materials/collections"
import { fileDoc, folderDoc, jobDoc } from "../../test/convex/materials/folders"
import { type Doc, type Id } from "../_generated/dataModel"
import { recordUsageEnded } from "../usage/record"
import { removeFolder } from "./records"

vi.mock("../discovery/sync/intent")

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
  folderId: Id<"folders">
) {
  return {
    collectionId: await database.insert("collections", tableDoc({ folderId })),
    fileId: await database.insert("files", fileDoc({ folderId })),
    jobId: await database.insert(
      "jobs",
      jobDoc({
        folderId,
        trigger: {
          expression: "0 9 * * *",
          timezone: "UTC",
          nextAt: 1,
          functionId: "s1" as Id<"_scheduled_functions">,
        },
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

test("deleting a subtree lifts its contents without changing update clocks", async () => {
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
  for (const resourceId of [...Object.values(seeded), deepFileId]) {
    expect(await database.get(resourceId)).toMatchObject({
      folderId: parentId,
      updatedAt: 1,
    })
  }
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
  for (const resourceId of Object.values(seeded)) {
    const resource = await database.get(resourceId)
    expect(resource?.folderId).toBeUndefined()
    expect(resource?.updatedAt).toBe(1)
  }
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
    target: { kind: "table", id: seeded.collectionId },
  })
  const fileShareId = await database.insert("shares", {
    organizationId: "org",
    createdBy: testOwner,
    secret: "b",
    createdAt: 1,
    expiresAt: 2,
    target: { kind: "file", id: seeded.fileId },
  })
  // Filed in the same folder as its owner: the sweep must survive reaching
  // a row its owner's removal already took.
  const ownedJobId = await database.insert(
    "jobs",
    jobDoc({
      folderId: childId,
      parent: { id: seeded.jobId, version: 1 },
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
  expect(await database.get(seeded.jobId)).toBeNull()
  expect(await database.get(ownedJobId)).toBeNull()
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

test.each([
  { operation: "moving", deleteResources: false },
  { operation: "deleting", deleteResources: true },
])(
  "$operation a folder's contents reparents its spend",
  async ({ deleteResources }) => {
    const { database, ctx } = deletionContext()
    const parentId = await database.insert("folders", folderDoc())
    const folderId = await database.insert("folders", folderDoc({ parentId }))
    const runId = await seedSpend(database, ctx, folderId)

    await remove(ctx, folderId, deleteResources)

    expect((await database.get(runId))?.folderId).toBe(parentId)
    expect(await spendFolders(database)).toEqual([parentId])
  }
)

test("spend left by a deleted root folder becomes unfiled", async () => {
  const { database, ctx } = deletionContext()
  const folderId = await database.insert("folders", folderDoc())
  const runId = await seedSpend(database, ctx, folderId)

  await remove(ctx, folderId)

  expect((await database.get(runId))?.folderId).toBeUndefined()
  expect(await spendFolders(database)).toEqual([undefined])
})

/** A completed run filed in the folder, rolled up through the real write
 *  path so the row carries the key the re-parenting has to recompute. */
async function seedSpend(
  database: TestDatabase,
  ctx: ReturnType<typeof deletionContext>["ctx"],
  folderId: string
) {
  const runId = await database.insert("runs", {
    organizationId: "org",
    audience: "organization",
    cause: { type: "time", scheduledAt: 0 },
    principal: { kind: "organization" },
    snapshot: { context: [], source: { type: "job" }, title: "Digest" },
    status: "completed",
    createdAt: 1,
    folderId,
  })

  await recordUsageEnded(ctx, {
    run: (await database.get(runId)) as unknown as Doc<"runs">,
    failed: false,
  })

  return runId
}

async function spendFolders(database: TestDatabase) {
  const rows = await database
    .query("usage")
    .withIndex("by_organization_and_date", (index) =>
      index.eq("organizationId", "org")
    )
    .collect()

  return rows.map((row) => row.folderId)
}
