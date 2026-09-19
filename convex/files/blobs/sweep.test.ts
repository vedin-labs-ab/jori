// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { registerBlobs } from "../../../test/convex/materials/blobs"
import { internal } from "../../_generated/api"
import schema from "../../schema"
import { blobExists, seedBlob } from "./fixtures"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const dayAgo = Date.now() - 25 * 60 * 60 * 1000

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
