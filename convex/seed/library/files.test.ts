// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { registerBlobs } from "../../../test/convex/materials/blobs"
import { internal } from "../../_generated/api"
import { blobExists, seedBlob } from "../../files/blobs/fixtures"
import { usageBucket } from "../../files/capacity/meter"
import schema from "../../schema"
import { seedRoster } from "../people"
import { files, seedFiles } from "./files"
import { seedFolders } from "./folders"

test("reseeding replaces file bytes and folder counters without doubling usage on backfill", async () => {
  const t = convexTest(schema, import.meta.glob("/convex/**/*.{ts,js}"))
  registerBlobs(t)
  const seed = { organizationId: "seed-organization", now: Date.now() }
  await t.run(async (ctx) => {
    await seedRoster(ctx, seed)
    await seedFolders(ctx, seed)
  })
  const upload = () =>
    t.run(async (ctx) =>
      Promise.all(
        files.map(async (file) => {
          const size = new TextEncoder().encode(file.body).byteLength
          return {
            key: file.key,
            blobKey: await seedBlob(ctx, seed.organizationId, { size }),
            size,
          }
        })
      )
    )
  const original = await upload()
  const expected = {
    bytes: original.reduce((sum, file) => sum + file.size, 0),
    count: files.length,
  }
  await t.mutation((ctx) => seedFiles(ctx, seed, original))
  const originalBuckets = await t.run(async (ctx) => {
    expect(await usageBucket(ctx, seed.organizationId)).toMatchObject(expected)
    return await ctx.db.query("fileUsage").collect()
  })
  await expect(
    t.mutation((ctx) => seedFiles(ctx, seed, original))
  ).rejects.toThrow("Upload fresh seed files")
  await t.run(async (ctx) => {
    expect(await blobExists(ctx, original[0].blobKey)).toBe(true)
  })
  const replacement = await upload()
  await t.mutation(async (ctx) => {
    // The library stage replaces folders before replacing their files.
    await seedFolders(ctx, seed)
    await seedFiles(ctx, seed, replacement)
  })
  await t.mutation(internal.files.capacity.reconcile.backfill, {})
  await t.mutation(internal.files.capacity.reconcile.backfill, {})
  await t.run(async (ctx) => {
    expect(await usageBucket(ctx, seed.organizationId)).toMatchObject(expected)
    for (const bucket of originalBuckets.filter((row) => row.key !== "total")) {
      expect(await ctx.db.get(bucket._id)).toBeNull()
    }
    const current = await ctx.db.query("files").collect()
    expect(current).toHaveLength(files.length)
    expect(current.every((file) => file.metered)).toBe(true)
    for (const previous of original) {
      expect(await blobExists(ctx, previous.blobKey)).toBe(false)
    }
    for (const file of replacement) {
      expect(await blobExists(ctx, file.blobKey)).toBe(true)
    }
  })
})
