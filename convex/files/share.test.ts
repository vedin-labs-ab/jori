import { describe, expect, test } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { type Id } from "../_generated/dataModel"
import { mintFileShare, openFileShare } from "./share"

// The mechanism is exercised in full against tables; these cover the
// file-shaped bits: creator visibility follows the file viewer rules, and
// files have no archived state to gate on.

const owner = "persons:owner" as Id<"persons">
const stranger = "persons:stranger" as Id<"persons">

async function createFile(
  database: TestDatabase,
  overrides: Record<string, unknown> = {}
) {
  return (await database.insert("files", {
    organizationId: "org",
    scope: "organization",
    ownerId: owner,
    storageId: "storage:1",
    name: "report.pdf",
    mimeType: "application/pdf",
    size: 512,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  })) as Id<"files">
}

async function createShare(
  database: TestDatabase,
  fileId: Id<"files">,
  overrides: Record<string, unknown> = {}
) {
  await database.insert("shares", {
    organizationId: "org",
    targetKind: "file",
    targetId: fileId,
    createdBy: owner,
    secret: "s3cret",
    createdAt: 1,
    expiresAt: Date.now() + 60_000,
    ...overrides,
  })
}

describe("opening a file share", () => {
  test("returns the file and share for a live link", async () => {
    const { database, ctx } = databaseContext()
    const fileId = await createFile(database)

    await createShare(database, fileId)

    const opened = await openFileShare(ctx, { fileId, secret: "s3cret" })

    expect(opened?.file.name).toBe("report.pdf")
  })

  test("returns null on a bad secret or expired link", async () => {
    const { database, ctx } = databaseContext()
    const fileId = await createFile(database)

    await createShare(database, fileId, { expiresAt: Date.now() - 1 })

    expect(await openFileShare(ctx, { fileId, secret: "wrong" })).toBeNull()
    expect(await openFileShare(ctx, { fileId, secret: "s3cret" })).toBeNull()
  })

  test("returns null when the creator cannot view a personal file", async () => {
    const { database, ctx } = databaseContext()
    const fileId = await createFile(database, { scope: "personal" })

    await createShare(database, fileId, { createdBy: stranger })

    expect(await openFileShare(ctx, { fileId, secret: "s3cret" })).toBeNull()
  })

  test("returns null on a share from another organization", async () => {
    const { database, ctx } = databaseContext()
    const fileId = await createFile(database)

    await createShare(database, fileId, { organizationId: "other" })

    expect(await openFileShare(ctx, { fileId, secret: "s3cret" })).toBeNull()
  })
})

describe("public file reads", () => {
  test("a public file opens with no secret; others stay closed", async () => {
    const { database, ctx } = databaseContext()
    const publicId = await createFile(database, {
      scope: undefined,
      visibility: { mode: "public" },
    })
    const organizationId = await createFile(database)

    expect((await openFileShare(ctx, { fileId: publicId }))?.read).toEqual({
      access: "public",
    })
    expect(await openFileShare(ctx, { fileId: organizationId })).toBeNull()
  })
})

describe("minting a file share", () => {
  test("shares the file the minting person can view", async () => {
    const { database, ctx } = databaseContext()
    const fileId = await createFile(database)
    const minted = await mintFileShare(ctx, {
      organizationId: "org",
      fileId,
      personId: owner,
    })

    expect(minted.url).toContain("/files/")
    expect(minted.url).toContain("#share=")
  })

  test("refuses a personal file the minting person cannot view", async () => {
    const { database, ctx } = databaseContext()
    const fileId = await createFile(database, { scope: "personal" })

    await expect(
      mintFileShare(ctx, { organizationId: "org", fileId, personId: stranger })
    ).rejects.toThrow("File was not found")
  })
})
