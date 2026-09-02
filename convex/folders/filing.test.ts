import { expect, test } from "vitest"
import { tableDoc, testOwner } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { fileDoc, folderDoc, jobDoc } from "../../test/convex/folders"
import { type Id } from "../_generated/dataModel"
import { fileResource } from "./filing"

const other = "persons:other" as Id<"persons">

const acting = { organizationId: "org", personId: testOwner }

test("each resource type files into a folder and unfiles with null", async () => {
  const { database, ctx } = databaseContext()
  const folderId = (await database.insert(
    "folders",
    folderDoc()
  )) as Id<"folders">
  const rows = {
    collection: await database.insert("collections", tableDoc()),
    file: await database.insert("files", fileDoc()),
    job: await database.insert("jobs", jobDoc()),
  } as const

  for (const [resourceType, resourceId] of Object.entries(rows)) {
    await fileResource(ctx, {
      ...acting,
      resourceType: resourceType as keyof typeof rows,
      resourceId,
      folderId,
    })
    expect((await database.get(resourceId))?.folderId).toBe(folderId)

    await fileResource(ctx, {
      ...acting,
      resourceType: resourceType as keyof typeof rows,
      resourceId,
      folderId: null,
    })
    expect((await database.get(resourceId))?.folderId).toBeUndefined()
  }
})

test("filing leaves the resource's updatedAt untouched", async () => {
  const { database, ctx } = databaseContext()
  const folderId = (await database.insert(
    "folders",
    folderDoc()
  )) as Id<"folders">
  const resourceId = await database.insert("collections", tableDoc())

  await fileResource(ctx, {
    ...acting,
    resourceType: "collection",
    resourceId,
    folderId,
  })

  expect((await database.get(resourceId))?.updatedAt).toBe(1)
})

test("filing someone else's personal resource is denied", async () => {
  const { database, ctx } = databaseContext()
  const folderId = (await database.insert(
    "folders",
    folderDoc()
  )) as Id<"folders">
  const personalTable = await database.insert(
    "collections",
    tableDoc({ visibility: { mode: "private" }, ownerId: testOwner })
  )

  await expect(
    fileResource(ctx, {
      organizationId: "org",
      personId: other,
      resourceType: "collection",
      resourceId: personalTable,
      folderId,
    })
  ).rejects.toThrow("Resource was not found.")

  await fileResource(ctx, {
    ...acting,
    resourceType: "collection",
    resourceId: personalTable,
    folderId,
  })

  expect((await database.get(personalTable))?.folderId).toBe(folderId)
})

test("the target folder must live in the same organization", async () => {
  const { database, ctx } = databaseContext()
  const foreignFolder = (await database.insert(
    "folders",
    folderDoc({ organizationId: "elsewhere" })
  )) as Id<"folders">
  const resourceId = await database.insert("files", fileDoc())

  await expect(
    fileResource(ctx, {
      ...acting,
      resourceType: "file",
      resourceId,
      folderId: foreignFolder,
    })
  ).rejects.toThrow("Folder was not found.")
})

test("foreign and unknown resources read as missing", async () => {
  const { database, ctx } = databaseContext()
  const folderId = (await database.insert(
    "folders",
    folderDoc()
  )) as Id<"folders">
  const foreign = await database.insert(
    "jobs",
    jobDoc({ organizationId: "elsewhere" })
  )

  await expect(
    fileResource(ctx, {
      ...acting,
      resourceType: "job",
      resourceId: foreign,
      folderId,
    })
  ).rejects.toThrow("Resource was not found.")
  await expect(
    fileResource(ctx, {
      ...acting,
      resourceType: "file",
      resourceId: "nonsense",
      folderId,
    })
  ).rejects.toThrow("Resource was not found.")
})
