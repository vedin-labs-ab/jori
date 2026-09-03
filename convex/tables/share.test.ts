import { describe, expect, test } from "vitest"
import {
  type ShareKind,
  type ShareOverrides,
  storeDoc,
  type TableOverrides,
  tableDoc,
  testOwner,
} from "../../test/convex/collections"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { folderDoc } from "../../test/convex/folders"
import { type Id } from "../_generated/dataModel"
import { activeShareLimit } from "../collections/shares"
import { mintTableShare, openTableShare, revokeTableShare } from "./share"

const stranger = "persons:stranger" as Id<"persons">

async function createTable(
  database: TestDatabase,
  overrides: TableOverrides = {}
) {
  return (await database.insert(
    "collections",
    tableDoc(overrides)
  )) as Id<"collections">
}

async function createShare(
  database: TestDatabase,
  tableId: Id<"collections">,
  { kind = "table", ...overrides }: ShareOverrides & { kind?: ShareKind } = {}
) {
  return (await database.insert("shares", {
    organizationId: "org",
    target: { kind, id: tableId },
    createdBy: testOwner,
    secret: "s3cret",
    createdAt: 1,
    expiresAt: Date.now() + 60_000,
    ...overrides,
  })) as Id<"shares">
}

describe("opening a table share", () => {
  test("returns the table and share for a live link", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database)

    await createShare(database, tableId)

    const opened = await openTableShare(ctx, { tableId, secret: "s3cret" })

    expect(opened?.table.name).toBe("Leads")
    expect(opened?.expiresAt).toEqual(expect.any(Number))
  })

  test("returns null on a bad secret", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database)

    await createShare(database, tableId)

    expect(await openTableShare(ctx, { tableId, secret: "wrong" })).toBeNull()
  })

  test("returns null on an expired link", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database)

    await createShare(database, tableId, { expiresAt: Date.now() - 1 })

    expect(await openTableShare(ctx, { tableId, secret: "s3cret" })).toBeNull()
  })

  test("returns null on an archived table", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database, { archivedAt: 5 })

    await createShare(database, tableId)

    expect(await openTableShare(ctx, { tableId, secret: "s3cret" })).toBeNull()
  })

  test("returns null on a share from another organization", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database)

    await createShare(database, tableId, { organizationId: "other" })

    expect(await openTableShare(ctx, { tableId, secret: "s3cret" })).toBeNull()
  })

  test("returns null when the creator lost access to a personal table", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database, {
      visibility: { mode: "private" },
    })

    await createShare(database, tableId, { createdBy: stranger })

    expect(await openTableShare(ctx, { tableId, secret: "s3cret" })).toBeNull()
  })

  test("returns null for a store's share opened as a table", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await database.insert("collections", storeDoc())

    await createShare(database, tableId, { kind: "store" })

    expect(await openTableShare(ctx, { tableId, secret: "s3cret" })).toBeNull()
  })

  test("returns null for unknown and malformed table ids", async () => {
    const { ctx } = databaseContext()

    expect(
      await openTableShare(ctx, { tableId: "garbage", secret: "s3cret" })
    ).toBeNull()
    expect(
      await openTableShare(ctx, {
        tableId: "collections:404",
        secret: "s3cret",
      })
    ).toBeNull()
  })
})

describe("the folder chain over a link", () => {
  test("a link dies when the table is filed into a folder that restricts it", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database)

    await createShare(database, tableId)

    const folderId = await database.insert(
      "folders",
      folderDoc({ visibility: { mode: "private" }, createdBy: stranger })
    )

    await database.patch(tableId, { folderId })

    expect(await openTableShare(ctx, { tableId, secret: "s3cret" })).toBeNull()

    // Out of the folder again, the same link opens again.
    await database.patch(tableId, { folderId: undefined })

    expect(
      (await openTableShare(ctx, { tableId, secret: "s3cret" }))?.table.name
    ).toBe("Leads")
  })

  test("a read with no secret opens nothing", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database)

    await createShare(database, tableId)

    expect(await openTableShare(ctx, { tableId })).toBeNull()
  })
})

describe("minting a table share", () => {
  test("stores an independent hex secret with a clamped expiry", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database)
    const before = Date.now()
    const minted = await mintTableShare(ctx, {
      organizationId: "org",
      tableId,
      personId: testOwner,
      expiresInHours: 9000,
    })
    const shares = await database.query("shares").collect()

    expect(shares).toHaveLength(1)
    expect(shares[0]?.secret).toMatch(/^[0-9a-f]{64}$/)
    expect(shares[0]?.target).toMatchObject({ kind: "table" })
    expect(minted.url).toContain(`#share=${shares[0]?.secret}`)
    expect(minted.expiresAt).toBeLessThanOrEqual(before + 169 * 60 * 60 * 1000)
  })

  test("retires the oldest active link at capacity", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database)

    for (let index = 0; index < activeShareLimit; index += 1) {
      await createShare(database, tableId, { createdAt: index })
    }

    await mintTableShare(ctx, {
      organizationId: "org",
      tableId,
      personId: testOwner,
    })

    const shares = await database.query("shares").collect()

    expect(shares).toHaveLength(activeShareLimit)
    expect(shares.some((share) => share.createdAt === 0)).toBe(false)
  })

  test("refuses a table whose folder restricts it, even to its owner", async () => {
    const { database, ctx } = databaseContext()
    const folderId = await database.insert(
      "folders",
      folderDoc({ visibility: { mode: "private" }, createdBy: stranger })
    )
    const tableId = await createTable(database, { folderId })

    await expect(
      mintTableShare(ctx, {
        organizationId: "org",
        tableId,
        personId: testOwner,
      })
    ).rejects.toThrow("move it out of the folder")
  })

  test("refuses archived tables", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database, { archivedAt: 5 })

    await expect(
      mintTableShare(ctx, {
        organizationId: "org",
        tableId,
        personId: testOwner,
      })
    ).rejects.toThrow("Restore the table")
  })
})

describe("revoking a table share", () => {
  test("deletes the link", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database)
    const shareId = await createShare(database, tableId)

    await revokeTableShare(ctx, {
      organizationId: "org",
      tableId,
      shareId,
      personId: testOwner,
    })

    expect(await database.query("shares").collect()).toHaveLength(0)
    expect(await openTableShare(ctx, { tableId, secret: "s3cret" })).toBeNull()
  })

  test("refuses a share that belongs to another table", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database)
    const otherTableId = await createTable(database)
    const shareId = await createShare(database, otherTableId)

    await expect(
      revokeTableShare(ctx, {
        organizationId: "org",
        tableId,
        shareId,
        personId: testOwner,
      })
    ).rejects.toThrow("Share link not found.")
  })
})
