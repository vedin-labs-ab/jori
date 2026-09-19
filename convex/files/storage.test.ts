import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { registerBlobs } from "../../test/convex/materials/blobs"
import { internal } from "../_generated/api"
import { type MutationCtx } from "../_generated/server"
import { purgeContent } from "../retention/erasure/purge"
import { contentTables } from "../retention/erasure/tables"
import schema from "../schema"
import { blobExists, seedBlob } from "./blobs/fixtures"
import { insertUploadedFile, purgeFile, swapFileBlob } from "./records"

function storage() {
  const t = convexTest(schema, import.meta.glob("/convex/**/*.{ts,js}"))
  registerBlobs(t)
  return t
}

test("uploads cannot claim another organization's blob or one already in use", async () => {
  const t = storage()
  const viewer = { organizationId: "other-organization" }
  const created = await t.run(async (ctx) => {
    const originalKey = await seedBlob(ctx, "organization")
    await insertUploadedFile(
      ctx,
      { organizationId: "organization" },
      { key: originalKey, size: 12, name: "original.txt" }
    )
    const ownKey = await seedBlob(ctx, viewer.organizationId)
    const ownFileId = await insertUploadedFile(ctx, viewer, {
      key: ownKey,
      size: 12,
      name: "own.txt",
    })
    return { originalKey, ownKey, ownFileId }
  })
  await expect(
    t.run((ctx) =>
      insertUploadedFile(ctx, viewer, {
        key: created.originalKey,
        size: 12,
        name: "claimed.txt",
      })
    )
  ).rejects.toThrow("Uploaded file was not found in storage")
  await expect(
    t.run((ctx) =>
      swapFileBlob(ctx, viewer, {
        fileId: created.ownFileId,
        key: created.ownKey,
        size: 12,
      })
    )
  ).rejects.toThrow("Uploaded file is already in use")
  await expect(
    t.mutation(internal.files.data.record, {
      organizationId: viewer.organizationId,
      visibility: { mode: "organization" },
      blobKey: created.ownKey,
      name: "claimed.txt",
      mimeType: "text/plain",
      size: 8,
    })
  ).rejects.toThrow("Uploaded file is already in use")
  await t.run(async (ctx) => {
    expect(await blobExists(ctx, created.originalKey)).toBe(true)
    expect(await blobExists(ctx, created.ownKey)).toBe(true)
    expect((await ctx.db.get(created.ownFileId))?.blobKey).toBe(created.ownKey)
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
        key: "organization/blob",
        size: 12,
        name: "note.txt",
        visibility: { mode: "private" },
      }
    )
  ).rejects.toThrow("Private files need a resolvable owner")
})

test.each(["remove", "replace", "retention"] as const)(
  "%s deletes the file's blob",
  async (operation) => {
    const t = storage()
    await t.run(async (ctx) => {
      const key = await seedBlob(ctx, "organization")
      const fileId = await insertUploadedFile(
        ctx,
        { organizationId: "organization" },
        { key, size: 12, name: "original.txt" }
      )
      const file = await ctx.db.get(fileId)
      if (!file) {
        throw new Error("Missing file")
      }
      if (operation === "remove") {
        await purgeFile(ctx, file)
      } else if (operation === "replace") {
        const replacement = await seedBlob(ctx, "organization")
        await swapFileBlob(
          ctx,
          { organizationId: "organization" },
          { fileId, key: replacement, size: 12 }
        )
        expect((await ctx.db.get(fileId))?.blobKey).toBe(replacement)
        expect(await blobExists(ctx, replacement)).toBe(true)
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
      expect(await blobExists(ctx, key)).toBe(false)
    })
  }
)
