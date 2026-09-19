// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { R2 } from "@convex-dev/r2"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { registerBlobs } from "../../../test/convex/materials/blobs"
import { internal } from "../../_generated/api"
import { purgeContent } from "../../retention/erasure/purge"
import { contentTables } from "../../retention/erasure/tables"
import schema from "../../schema"
import { blobExists, seedBlob } from "./fixtures"
import { blobUploadUrl, requireUnusedUpload, storeBlob } from "./index"
import { uploadGraceMs } from "./uploads"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const dayAgo = Date.now() - 25 * 60 * 60 * 1000

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test("cleans abandoned uploads while preserving referenced files and fresh uploads", async () => {
  const t = convexTest(schema, modules)
  registerBlobs(t)
  const [orphan, owned, fresh] = await t.run(async (ctx) => {
    const orphan = await seedBlob(ctx, "other", { lastModified: dayAgo })
    const owned = await seedBlob(ctx, "other", { lastModified: dayAgo })
    await ctx.db.insert("files", {
      organizationId: "other",
      blobKey: owned,
      name: "keep.txt",
      size: 4,
      mimeType: "text/plain",
      visibility: { mode: "organization" },
      createdAt: dayAgo,
      updatedAt: dayAgo,
    })
    return [orphan, owned, await seedBlob(ctx, "other")]
  })
  await t.mutation(internal.files.blobs.sweep.run, {})
  await t.run(async (ctx) => {
    expect(await blobExists(ctx, orphan)).toBe(false)
    expect(await blobExists(ctx, owned)).toBe(true)
    expect(await blobExists(ctx, fresh)).toBe(true)
  })
})

test("reclaims a never-recorded upload that arrives after its workspace closes", async () => {
  vi.useFakeTimers()
  const startedAt = Date.now()
  const t = convexTest(schema, modules)
  registerBlobs(t)
  const { key, url } = await t.mutation(
    async (ctx) => await blobUploadUrl(ctx, "closed")
  )
  const retention = await t.run(
    async (ctx) =>
      await ctx.db.insert("workspaceRetention", {
        organizationId: "closed",
        state: "deleting",
        endedAt: startedAt,
        deletesAt: startedAt,
        stage: 6,
      })
  )
  for (let step = 0; step <= contentTables.length; step++) {
    if (
      await t.run(async (ctx) => {
        const row = await ctx.db.get(retention)
        if (row === null) {
          throw new Error("Missing workspace deletion")
        }
        return await purgeContent(ctx, row)
      })
    ) {
      break
    }
  }
  const expiresInMs =
    Number(new URL(url).searchParams.get("X-Amz-Expires")) * 1000
  expect(expiresInMs).toBeGreaterThan(0)
  expect(expiresInMs).toBeLessThan(uploadGraceMs)
  // A PUT still succeeds after workspace erasure while its URL is valid.
  // This storage object deliberately has no R2 component metadata.
  vi.setSystemTime(startedAt + expiresInMs / 2)
  const objects = new Set([key])
  vi.spyOn(R2.prototype, "deleteObject").mockImplementation(
    async (_ctx, blobKey) => {
      objects.delete(blobKey)
    }
  )
  await t.mutation(internal.files.blobs.sweep.run, {})
  expect(objects.has(key)).toBe(true)
  vi.setSystemTime(startedAt + uploadGraceMs)
  await t.mutation(internal.files.blobs.sweep.run, {})
  expect(objects.has(key)).toBe(false)
  expect(
    await t.run(async (ctx) => await ctx.db.query("uploads").collect())
  ).toEqual([])
})

test("a failed runtime store remains discoverable before metadata exists", async () => {
  const t = convexTest(schema, modules)
  registerBlobs(t)
  const objects = new Set<string>()
  vi.spyOn(R2.prototype, "store").mockImplementation(
    async (_ctx, _bytes, options) => {
      if (typeof options !== "object" || options.key === undefined) {
        throw new Error("Missing key")
      }
      objects.add(options.key)
      throw new Error("Metadata sync failed")
    }
  )
  vi.spyOn(R2.prototype, "deleteObject").mockImplementation(
    async (_ctx, key) => {
      objects.delete(key)
    }
  )
  await expect(
    t.action(
      async (ctx) =>
        await storeBlob(ctx, {
          organizationId: "org",
          bytes: new Uint8Array([1]),
          mimeType: "text/plain",
        })
    )
  ).rejects.toThrow("Metadata sync failed")
  expect(objects.size).toBe(1)
  await t.mutation(internal.files.blobs.sweep.run, { cutoff: Date.now() })
  expect(objects.size).toBe(0)
})

test("expired uploads cannot be claimed before or after cleanup", async () => {
  const t = convexTest(schema, modules)
  registerBlobs(t)
  const key = await t.run(
    async (ctx) => await seedBlob(ctx, "org", { lastModified: dayAgo })
  )
  const claim = () =>
    t.mutation(
      async (ctx) =>
        await requireUnusedUpload(ctx, { organizationId: "org", key })
    )
  await expect(claim()).rejects.toThrow("Upload expired")
  // Leave metadata in place to model a HEAD sync racing with cleanup.
  vi.spyOn(R2.prototype, "deleteObject").mockResolvedValue()
  await t.mutation(internal.files.blobs.sweep.run, {})
  await expect(claim()).rejects.toThrow("Upload expired")
})

test("continues cleanup when abandoned uploads exceed one batch", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, modules)
  registerBlobs(t)
  await t.run(async (ctx) => {
    for (let index = 0; index < 51; index++) {
      await ctx.db.insert("uploads", {
        key: `org/${index}`,
        createdAt: dayAgo,
      })
    }
  })
  const remove = vi.spyOn(R2.prototype, "deleteObject").mockResolvedValue()
  await t.mutation(internal.files.blobs.sweep.run, {})
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  expect(remove).toHaveBeenCalledTimes(51)
  expect(
    await t.run(async (ctx) => await ctx.db.query("uploads").collect())
  ).toEqual([])
})
