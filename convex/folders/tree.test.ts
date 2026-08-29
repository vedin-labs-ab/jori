import { expect, test } from "vitest"
import { databaseContext } from "../../test/convex/database"
import { folderDoc } from "../../test/convex/folders"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  ancestorPath,
  getOrganizationFolder,
  listOrganizationFolders,
  normalizeFolderName,
  treeCap,
} from "./tree"

test("names are trimmed, required, and capped", () => {
  expect(normalizeFolderName("  Projects  ")).toBe("Projects")
  expect(normalizeFolderName("x".repeat(200))).toHaveLength(120)
  expect(() => normalizeFolderName("   ")).toThrow("A name is required.")
  expect(() => normalizeFolderName(undefined)).toThrow("A name is required.")
})

test("foreign folders read as missing", async () => {
  const { database, ctx } = databaseContext()
  const folderId = (await database.insert(
    "folders",
    folderDoc({ organizationId: "elsewhere" })
  )) as Id<"folders">

  expect(await getOrganizationFolder(ctx, "org", folderId)).toBeNull()
})

test("the ancestor path runs root-first and ends with the folder", async () => {
  const { database, ctx } = databaseContext()
  const rootId = await database.insert("folders", folderDoc({ name: "Root" }))
  const middleId = await database.insert(
    "folders",
    folderDoc({ name: "Middle", parentId: rootId })
  )
  const leafId = await database.insert(
    "folders",
    folderDoc({ name: "Leaf", parentId: middleId })
  )
  const leaf = (await database.get(leafId)) as Doc<"folders">

  const path = await ancestorPath(ctx, leaf)

  expect(path.map((entry) => entry.name)).toEqual(["Root", "Middle", "Leaf"])
  expect(path[0]?.folderId).toBe(rootId)
  expect(path[2]?.folderId).toBe(leafId)
})

test("the flat tree listing stops at the cap", async () => {
  const { database, ctx } = databaseContext()

  for (let index = 0; index < treeCap + 5; index += 1) {
    await database.insert("folders", folderDoc({ name: `Folder ${index}` }))
  }

  await database.insert("folders", folderDoc({ organizationId: "elsewhere" }))

  const folders = await listOrganizationFolders(ctx, "org")

  expect(folders).toHaveLength(treeCap)
  expect(folders.every((folder) => folder.organizationId === "org")).toBe(true)
})
