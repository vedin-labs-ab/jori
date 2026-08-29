import { expect, test, vi } from "vitest"
import { databaseContext } from "../test/convex/database"
import { legacyTables, purgeLegacyBatch, stripBatch } from "./purge"

test("deletes legacy rows and their storage blobs", async () => {
  const deletedBlobs: string[] = []
  const { ctx, database } = databaseContext({
    storage: {
      delete: async (storageId: string) => {
        deletedBlobs.push(storageId)
      },
    },
  })
  const blobsPhase = legacyTables.indexOf("appBlobs")

  await database.insert("appBlobs", { storageId: "blob-1" })
  await database.insert("appBlobs", { storageId: "blob-2" })
  await database.insert("appBlobs", {})

  const next = await purgeLegacyBatch(ctx, blobsPhase)

  expect(deletedBlobs).toEqual(["blob-1", "blob-2"])
  expect(await database.query("appBlobs").collect()).toEqual([])
  expect(next).toEqual({ phase: blobsPhase + 1, cursor: null })
})

test("keeps deleting a row whose blob is already gone", async () => {
  const { ctx, database } = databaseContext({
    storage: {
      delete: vi.fn(async () => {
        throw new Error("Blob not found.")
      }),
    },
  })
  const assetsPhase = legacyTables.indexOf("assets")

  await database.insert("assets", { storageId: "blob-1" })

  const next = await purgeLegacyBatch(ctx, assetsPhase)

  expect(await database.query("assets").collect()).toEqual([])
  expect(next).toEqual({ phase: assetsPhase + 1, cursor: null })
})

test("stays on a legacy table while a full batch remains", async () => {
  const { ctx, database } = databaseContext()

  for (let index = 0; index < 101; index += 1) {
    await database.insert("apps", { title: `App ${index}` })
  }

  const next = await purgeLegacyBatch(ctx, 0)

  expect(next).toEqual({ phase: 0, cursor: null })
  expect((await database.query("apps").collect()).length).toBe(1)
})

test("strips stray legacy fields and leaves other documents alone", async () => {
  const { ctx, database } = databaseContext()
  const strayId = await database.insert("automations", {
    appId: "apps:legacy",
    playbook: { key: "preread", version: 1 },
    name: "Stray",
  })
  const cleanId = await database.insert("automations", { name: "Clean" })

  const next = await stripBatch(ctx, legacyTables.length, null)

  expect(await database.get(strayId)).toEqual({
    _creationTime: expect.any(Number),
    _id: strayId,
    name: "Stray",
  })
  expect(await database.get(cleanId)).toEqual({
    _creationTime: expect.any(Number),
    _id: cleanId,
    name: "Clean",
  })
  expect(next).toEqual({ phase: legacyTables.length + 1, cursor: null })
})

test("strips stray trial flags from runs", async () => {
  const { ctx, database } = databaseContext()
  const strayId = await database.insert("runs", { trial: true, status: "done" })

  const next = await stripBatch(ctx, legacyTables.length + 1, null)

  expect(await database.get(strayId)).toEqual({
    _creationTime: expect.any(Number),
    _id: strayId,
    status: "done",
  })
  expect(next).toEqual({ phase: legacyTables.length + 2, cursor: null })
})

test("finishes after the last strip phase", async () => {
  const { ctx } = databaseContext()

  expect(await stripBatch(ctx, legacyTables.length + 2, null)).toBeNull()
})
