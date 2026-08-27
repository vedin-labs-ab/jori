import { describe, expect, test } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { type Id } from "../_generated/dataModel"
import { activeShareLimit } from "../materials/shares"
import { mintTableShare, openTableShare, revokeTableShare } from "./share"

const owner = "persons:owner" as Id<"persons">
const stranger = "persons:stranger" as Id<"persons">

async function createTable(
  database: TestDatabase,
  overrides: Record<string, unknown> = {}
) {
  return (await database.insert("tables", {
    organizationId: "org",
    ownerId: owner,
    scope: "organization",
    name: "Leads",
    description: "Open leads",
    columns: [{ key: "title", name: "Title", type: "string" }],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  })) as Id<"tables">
}

async function createShare(
  database: TestDatabase,
  tableId: Id<"tables">,
  overrides: Record<string, unknown> = {}
) {
  return (await database.insert("tableShares", {
    organizationId: "org",
    tableId,
    createdBy: owner,
    secret: "s3cret",
    createdAt: 1,
    expiresAt: Date.now() + 60_000,
    ...overrides,
  })) as Id<"tableShares">
}

describe("opening a table share", () => {
  test("returns the table and share for a live link", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database)

    await createShare(database, tableId)

    const opened = await openTableShare(ctx, { tableId, secret: "s3cret" })

    expect(opened?.table.name).toBe("Leads")
    expect(opened?.share.secret).toBe("s3cret")
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
    const tableId = await createTable(database, { scope: "personal" })

    await createShare(database, tableId, { createdBy: stranger })

    expect(await openTableShare(ctx, { tableId, secret: "s3cret" })).toBeNull()
  })

  test("returns null for unknown and malformed table ids", async () => {
    const { ctx } = databaseContext()

    expect(
      await openTableShare(ctx, { tableId: "garbage", secret: "s3cret" })
    ).toBeNull()
    expect(
      await openTableShare(ctx, { tableId: "tables:404", secret: "s3cret" })
    ).toBeNull()
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
      personId: owner,
      expiresInHours: 9000,
    })
    const shares = await database.query("tableShares").collect()

    expect(shares).toHaveLength(1)
    expect(shares[0]?.secret).toMatch(/^[0-9a-f]{64}$/)
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
      personId: owner,
    })

    const shares = await database.query("tableShares").collect()

    expect(shares).toHaveLength(activeShareLimit)
    expect(shares.some((share) => share.createdAt === 0)).toBe(false)
  })

  test("refuses archived tables", async () => {
    const { database, ctx } = databaseContext()
    const tableId = await createTable(database, { archivedAt: 5 })

    await expect(
      mintTableShare(ctx, { organizationId: "org", tableId, personId: owner })
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
      personId: owner,
    })

    expect(await database.query("tableShares").collect()).toHaveLength(0)
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
        personId: owner,
      })
    ).rejects.toThrow("Share link not found.")
  })
})
