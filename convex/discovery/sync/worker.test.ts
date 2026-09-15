// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"
import { findSource, mark, raise } from "./intent"

const provider = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  fail: false,
}))
vi.mock("../provider", () => ({
  version: "test",
  accessTokens: () => ["org"],
  remove: async (_org: string, keys: string[]) => {
    for (const [id, row] of provider.rows) {
      if (keys.includes(String(row.key))) {
        provider.rows.delete(id)
      }
    }
  },
  upsert: async (_org: string, rows: Record<string, unknown>[]) => {
    if (provider.fail) {
      throw new Error("Interrupted upload")
    }
    for (const row of rows) {
      provider.rows.set(String(row.id), row)
    }
  },
  refresh: vi.fn(),
}))
const modules = import.meta.glob("/convex/**/*.{ts,js}")
afterEach(() => vi.useRealTimers())
async function fixture() {
  vi.useFakeTimers()
  vi.setSystemTime(100_000)
  provider.rows.clear()
  provider.fail = false
  const t = convexTest(schema, modules)
  const id = await t.run(async (ctx) => {
    const owner = await ctx.db.insert("persons", {
      organizationId: "org",
      createdAt: 1,
      updatedAt: 1,
    })
    const id = await ctx.db.insert("folders", {
      createdBy: owner,
      organizationId: "org",
      name: "Original A",
      visibility: { mode: "organization" },
      createdAt: 1,
      updatedAt: 1,
    })
    await mark(ctx, "org", id)
    return id
  })
  async function work() {
    vi.setSystemTime(Date.now() + 61 * 60_000)
    await t.mutation(internal.discovery.sync.queue.start, {
      organizationId: "org",
      lane: "text",
    })
    const queue = await t.run((ctx) => ctx.db.query("discoveryQueues").first())
    if (!queue) {
      throw new Error("Missing queue")
    }
    await t.action(internal.discovery.sync.worker.run, {
      organizationId: "org",
      lane: "text",
      lease: queue.lease,
    })
  }
  async function edit(name: string) {
    await t.run(async (ctx) => {
      await ctx.db.patch(id, { name })
      await mark(ctx, "org", id)
    })
  }
  return { t, id, work, edit }
}
test("a destructive upload failure followed by reverting the source rebuilds the provider copy", async () => {
  const { t, id, work, edit } = await fixture()
  await work()
  expect([...provider.rows.values()][0]?.title).toBe("Original A")
  await edit("Changed B")
  provider.fail = true
  await work()
  expect(provider.rows.size).toBe(0)
  expect(await t.run((ctx) => findSource(ctx, `folders:${id}`))).toMatchObject({
    pending: true,
    attempts: 1,
  })
  await edit("Original A")
  provider.fail = false
  await work()
  expect([...provider.rows.values()][0]?.title).toBe("Original A")
  expect(await t.run((ctx) => findSource(ctx, `folders:${id}`))).toMatchObject({
    pending: false,
  })
})
test("a superseded publication and partial passage write cannot preserve accepted hashes or cache content", async () => {
  const { t } = await fixture()
  await t.run((ctx) => raise(ctx, "org", "files:fixture"))
  await t.mutation(internal.discovery.sync.state.finish, {
    key: "files:fixture",
    generation: 1,
    revision: "A",
    textHash: "A",
    fileKey: "A",
    parts: 1,
  })
  await t.run((ctx) => raise(ctx, "org", "files:fixture"))
  expect(
    await t.mutation(internal.discovery.sync.state.publishing, {
      key: "files:fixture",
      generation: 2,
    })
  ).toBe(true)
  await t.mutation(internal.discovery.sync.passages.store, {
    organizationId: "org",
    key: "files:fixture",
    generation: 2,
    start: 0,
    sections: [{ text: "B", location: { kind: "passage", id: "0" } }],
  })
  await t.run((ctx) => raise(ctx, "org", "files:fixture"))
  await t.mutation(internal.discovery.sync.state.finish, {
    key: "files:fixture",
    generation: 2,
    revision: "B",
    textHash: "B",
    fileKey: "B",
    parts: 1,
  })
  const current = await t.run((ctx) => findSource(ctx, "files:fixture"))
  expect(current?.pending).toBe(true)
  expect(current?.revision).toBeUndefined()
  expect(current?.textHash).toBeUndefined()
  expect(current?.fileKey).toBeUndefined()
  expect(
    await t.mutation(internal.discovery.sync.state.publishing, {
      key: "files:fixture",
      generation: 2,
    })
  ).toBe(false)
})
