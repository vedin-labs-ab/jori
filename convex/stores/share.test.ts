import { describe, expect, test } from "vitest"
import {
  type ShareKind,
  type ShareOverrides,
  type StoreOverrides,
  storeDoc,
  tableDoc,
  testOwner,
} from "../../test/convex/collections"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { type Id } from "../_generated/dataModel"
import { openStoreShare } from "./share"

// The mechanism is exercised in full against tables; these cover the
// store-shaped bits: the same gate guards the store document.

const stranger = "persons:stranger" as Id<"persons">

async function createStore(
  database: TestDatabase,
  overrides: StoreOverrides = {}
) {
  return (await database.insert(
    "collections",
    storeDoc(overrides)
  )) as Id<"collections">
}

async function createShare(
  database: TestDatabase,
  storeId: Id<"collections">,
  { kind = "store", ...overrides }: ShareOverrides & { kind?: ShareKind } = {}
) {
  await database.insert("shares", {
    organizationId: "org",
    target: { kind, id: storeId },
    createdBy: testOwner,
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
    expect(opened?.expiresAt ?? 0).toBeGreaterThan(Date.now())
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
    const storeId = await createStore(database, {
      visibility: { mode: "private" },
    })

    await createShare(database, storeId, { createdBy: stranger })

    expect(await openStoreShare(ctx, { storeId, secret: "s3cret" })).toBeNull()
  })

  test("returns null for a table's share opened as a store", async () => {
    const { database, ctx } = databaseContext()
    const storeId = await database.insert("collections", tableDoc())

    await createShare(database, storeId, { kind: "table" })

    expect(await openStoreShare(ctx, { storeId, secret: "s3cret" })).toBeNull()
  })
})
