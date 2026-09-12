// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
afterEach(() => vi.useRealTimers())

test("cleans abandoned uploads while preserving referenced files and fresh uploads", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, modules)
  const [orphan, owned] = await t.run(async (ctx) => {
    const orphan = await ctx.storage.store(new Blob(["abandoned"]))
    const owned = await ctx.storage.store(new Blob(["keep"]))
    await ctx.db.insert("files", {
      organizationId: "other",
      storageId: owned,
      name: "keep.txt",
      size: 4,
      mimeType: "text/plain",
      visibility: { mode: "organization" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return [orphan, owned]
  })
  vi.advanceTimersByTime(25 * 60 * 60 * 1000)
  const fresh = await t.run((ctx) => ctx.storage.store(new Blob(["uploading"])))
  await t.mutation(internal.files.cleanup.orphans.sweep, {})
  expect(await t.run((ctx) => ctx.db.system.get(orphan))).toBeNull()
  expect(await t.run((ctx) => ctx.db.system.get(owned))).not.toBeNull()
  expect(await t.run((ctx) => ctx.db.system.get(fresh))).not.toBeNull()
})
