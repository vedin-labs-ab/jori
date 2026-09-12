import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { purgeContent } from "../retention/erasure/purge"
import { contentTables } from "../retention/erasure/tables"
import schema from "../schema"
import { insertUploadedFile, purgeFile, swapFileBlob } from "./records"

test("uploads cannot claim another file's blob or delete it through replacement", async () => {
  const t = convexTest(schema, import.meta.glob("/convex/**/*.{ts,js}"))
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
  await expect(
    t.mutation(internal.files.data.record, {
      organizationId: viewer.organizationId,
      visibility: { mode: "organization" },
      storageId: created.originalStorageId,
      name: "claimed.txt",
      mimeType: "text/plain",
      size: 8,
    })
  ).rejects.toThrow("Uploaded file is already in use")
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

test.each(["remove", "replace", "retention"] as const)(
  "%s keeps a legacy shared blob until its last file is removed",
  async (operation) => {
    const t = convexTest(schema, import.meta.glob("/convex/**/*.{ts,js}"))
    await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["Shared content"]))
      const fileId = await insertUploadedFile(
        ctx,
        { organizationId: "organization" },
        { storageId, name: "original.txt" }
      )
      const file = await ctx.db.get(fileId)
      if (!file) {
        throw new Error("Missing file")
      }
      const otherId = await ctx.db.insert("files", {
        organizationId: "other-organization",
        visibility: { mode: "organization" },
        storageId,
        name: "legacy.txt",
        mimeType: file.mimeType,
        size: file.size,
        createdAt: 0,
        updatedAt: 0,
      })
      if (operation === "remove") {
        await purgeFile(ctx, file)
      } else if (operation === "replace") {
        const replacement = await ctx.storage.store(new Blob(["Replacement"]))
        await swapFileBlob(
          ctx,
          { organizationId: "organization" },
          {
            fileId,
            storageId: replacement,
          }
        )
        expect((await ctx.db.get(fileId))?.storageId).toBe(replacement)
      } else {
        const retentionId = await ctx.db.insert("workspaceRetention", {
          organizationId: "organization",
          state: "deleting",
          endedAt: 0,
          deletesAt: 0,
          stage: 6 + contentTables.indexOf("files"),
        })
        const retention = await ctx.db.get(retentionId)
        if (!retention) {
          throw new Error("Missing retention")
        }
        await purgeContent(ctx, retention)
        expect(await ctx.db.get(fileId)).toBeNull()
      }
      expect(await ctx.storage.get(storageId)).not.toBeNull()
      const other = await ctx.db.get(otherId)
      if (!other) {
        throw new Error("Other workspace file was removed")
      }
      await purgeFile(ctx, other)
      expect(await ctx.storage.get(storageId)).toBeNull()
    })
  }
)
