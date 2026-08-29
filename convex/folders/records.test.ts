import { expect, test, vi } from "vitest"
import { testOwner } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { folderDoc } from "../../test/convex/folders"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { createFolder, moveFolder, renameFolder } from "./records"
import { maxTreeDepth } from "./tree"

const base = { organizationId: "org", personId: testOwner }

async function createChain(ctx: MutationCtx, length: number) {
  let parentId: Id<"folders"> | undefined

  for (let index = 0; index < length; index += 1) {
    const folder = await createFolder(ctx, {
      ...base,
      name: `Level ${index + 1}`,
      parentId,
    })

    parentId = folder._id
  }

  if (parentId === undefined) {
    throw new Error("Chain was empty.")
  }

  return parentId
}

test("creating normalizes the name and links the parent", async () => {
  const { ctx } = databaseContext()
  const parent = await createFolder(ctx, { ...base, name: " Projects " })
  const child = await createFolder(ctx, {
    ...base,
    name: "Drafts",
    parentId: parent._id,
  })

  expect(parent.name).toBe("Projects")
  expect(parent.parentId).toBeUndefined()
  expect(child.parentId).toBe(parent._id)
  expect(child.createdBy).toBe(testOwner)
})

test("creating rejects empty names and foreign parents", async () => {
  const { database, ctx } = databaseContext()
  const foreignId = (await database.insert(
    "folders",
    folderDoc({ organizationId: "elsewhere" })
  )) as Id<"folders">

  await expect(createFolder(ctx, { ...base, name: "  " })).rejects.toThrow(
    "A name is required."
  )
  await expect(
    createFolder(ctx, { ...base, name: "Drafts", parentId: foreignId })
  ).rejects.toThrow("Folder was not found.")
})

test("renaming normalizes and bumps updatedAt", async () => {
  const { ctx } = databaseContext()
  const folder = await createFolder(ctx, { ...base, name: "Projects" })
  const createdAt = folder.updatedAt

  vi.useFakeTimers()
  vi.setSystemTime(createdAt + 1000)

  const renamed = await renameFolder(ctx, {
    organizationId: "org",
    folderId: folder._id,
    name: "  Archive  ",
  })

  vi.useRealTimers()

  expect(renamed.name).toBe("Archive")
  expect(renamed.updatedAt).toBe(createdAt + 1000)
})

test("the tree caps out at depth 8", async () => {
  const { ctx } = databaseContext()
  const deepestId = await createChain(ctx, maxTreeDepth)

  await expect(
    createFolder(ctx, { ...base, name: "Too deep", parentId: deepestId })
  ).rejects.toThrow("Folders can nest at most 8 levels deep.")
})

test("moving reparents and can drop a folder at the root", async () => {
  const { database, ctx } = databaseContext()
  const first = await createFolder(ctx, { ...base, name: "First" })
  const second = await createFolder(ctx, {
    ...base,
    name: "Second",
    parentId: first._id,
  })

  const movedToRoot = await moveFolder(ctx, {
    organizationId: "org",
    folderId: second._id,
  })

  expect(movedToRoot.parentId).toBeUndefined()

  await moveFolder(ctx, {
    organizationId: "org",
    folderId: first._id,
    parentId: second._id,
  })

  const refreshed = await database.get(first._id)

  expect(refreshed?.parentId).toBe(second._id)
})

test("moving into the folder's own subtree is a cycle", async () => {
  const { ctx } = databaseContext()
  const parent = await createFolder(ctx, { ...base, name: "Parent" })
  const child = await createFolder(ctx, {
    ...base,
    name: "Child",
    parentId: parent._id,
  })

  await expect(
    moveFolder(ctx, {
      organizationId: "org",
      folderId: parent._id,
      parentId: parent._id,
    })
  ).rejects.toThrow("A folder cannot be moved into its own subtree.")
  await expect(
    moveFolder(ctx, {
      organizationId: "org",
      folderId: parent._id,
      parentId: child._id,
    })
  ).rejects.toThrow("A folder cannot be moved into its own subtree.")
})

test("moving rejects sinking a subtree below the depth cap", async () => {
  const { ctx } = databaseContext()
  const deepId = await createChain(ctx, maxTreeDepth - 1)
  const top = await createFolder(ctx, { ...base, name: "Top" })

  await createFolder(ctx, { ...base, name: "Nested", parentId: top._id })

  await expect(
    moveFolder(ctx, {
      organizationId: "org",
      folderId: top._id,
      parentId: deepId,
    })
  ).rejects.toThrow("Folders can nest at most 8 levels deep.")
})
