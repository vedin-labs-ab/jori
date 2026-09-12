import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import schema from "../schema"
import { insertUploadedFile, swapFileBlob } from "./records"

test("uploads cannot claim another file's blob or delete it through replacement", async () => {
  const t = convexTest(schema, import.meta.glob("../**/*.ts"))
  const viewer = { organizationId: "other-organization" }
  const created = await t.run(async (ctx) => {
    const originalStorageId = await ctx.storage.store(new Blob(["Original"]))
    const originalFileId = await insertUploadedFile(
      ctx,
      { organizationId: "organization" },
      { storageId: originalStorageId, name: "original.txt" }
    )
    const ownStorageId = await ctx.storage.store(new Blob(["Own file"]))
    const ownFileId = await insertUploadedFile(ctx, viewer, {
      storageId: ownStorageId,
      name: "own.txt",
    })
    return { originalStorageId, originalFileId, ownStorageId, ownFileId }
  })
  await expect(
    t.run((ctx) =>
      insertUploadedFile(ctx, viewer, {
        storageId: created.originalStorageId,
        name: "claimed.txt",
      })
    )
  ).rejects.toThrow("Uploaded file is already in use")
  for (const existingStorageId of [
    created.originalStorageId,
    created.ownStorageId,
  ]) {
    await expect(
      t.run((ctx) =>
        swapFileBlob(ctx, viewer, {
          fileId: created.ownFileId,
          storageId: existingStorageId,
        })
      )
    ).rejects.toThrow("Uploaded file is already in use")
  }
  await t.run(async (ctx) => {
    expect(await ctx.storage.get(created.originalStorageId)).not.toBeNull()
    expect(await ctx.storage.get(created.ownStorageId)).not.toBeNull()
    expect((await ctx.db.get(created.ownFileId))?.storageId).toBe(
      created.ownStorageId
    )
    expect((await ctx.db.query("files").collect()).length).toBe(2)
  })
})

test("private uploads require a resolvable owner", async () => {
  const ctx = {
    db: { system: { get: vi.fn() } },
  } as unknown as MutationCtx

  await expect(
    insertUploadedFile(
      ctx,
      { organizationId: "organization" },
      {
        storageId: "storage-id" as Id<"_storage">,
        name: "note.txt",
        visibility: { mode: "private" },
      }
    )
  ).rejects.toThrow("Private files need a resolvable owner")
})
