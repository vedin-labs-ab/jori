import { describe, expect, test } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { type Id } from "../_generated/dataModel"
import { openStoreShare } from "./share"

// The mechanism is exercised in full against tables; these cover the
// store-shaped bits: the same gate guards the store document.

const owner = "persons:owner" as Id<"persons">
const stranger = "persons:stranger" as Id<"persons">

async function createStore(
  database: TestDatabase,
  overrides: Record<string, unknown> = {}
) {
  return (await database.insert("stores", {
    organizationId: "org",
    ownerId: owner,
    scope: "organization",
    name: "Settings",
    schema: { type: "object" },
    schemaHash: "hash",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  })) as Id<"stores">
}

async function createShare(
  database: TestDatabase,
  storeId: Id<"stores">,
  overrides: Record<string, unknown> = {}
) {
  await database.insert("storeShares", {
    organizationId: "org",
    storeId,
    createdBy: owner,
    secret: "s3cret",
    createdAt: 1,
    expiresAt: Date.now() + 60_000,
    ...overrides,
  })
}

describe("opening a store share", () => {
  test("returns the store and share for a live link", async () => {
    const { database, ctx } = databaseContext()
    const storeId = await createStore(database)

    await createShare(database, storeId)

    const opened = await openStoreShare(ctx, { storeId, secret: "s3cret" })

    expect(opened?.store.name).toBe("Settings")
    expect(opened?.share.expiresAt).toBeGreaterThan(Date.now())
  })

  test("returns null on a bad secret, expiry, or archived store", async () => {
    const { database, ctx } = databaseContext()
    const storeId = await createStore(database)
    const archivedId = await createStore(database, { archivedAt: 5 })

    await createShare(database, storeId, { expiresAt: Date.now() - 1 })
    await createShare(database, archivedId)

    expect(await openStoreShare(ctx, { storeId, secret: "wrong" })).toBeNull()
    expect(await openStoreShare(ctx, { storeId, secret: "s3cret" })).toBeNull()
    expect(
      await openStoreShare(ctx, { storeId: archivedId, secret: "s3cret" })
    ).toBeNull()
  })

  test("returns null when the creator lost access to a personal store", async () => {
    const { database, ctx } = databaseContext()
    const storeId = await createStore(database, { scope: "personal" })

    await createShare(database, storeId, { createdBy: stranger })

    expect(await openStoreShare(ctx, { storeId, secret: "s3cret" })).toBeNull()
  })
})
