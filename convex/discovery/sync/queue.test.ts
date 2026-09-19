// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"
import { sourceTables } from "../source/types"
import { raise } from "./intent"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
afterEach(() => vi.useRealTimers())
async function fixture() {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
  return convexTest(schema, modules)
}
test("bulk writes coalesce wakeups, text batches hold 16 sources and files have an independent lease", async () => {
  const t = await fixture()
  await t.run(async (ctx) => {
    for (let i = 0; i < 40; i++) {
      await raise(ctx, "org", `documents:${i}`)
    }
    await raise(ctx, "org", "files:file")
  })
  expect(
    await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect())
  ).toHaveLength(2)
  vi.setSystemTime(Date.now() + 2000)
  expect(
    await t.query(internal.discovery.sync.state.batch, {
      organizationId: "org",
      lane: "text",
    })
  ).toHaveLength(16)
  await t.mutation(internal.discovery.sync.queue.start, {
    organizationId: "org",
    lane: "file",
  })
  await t.mutation(internal.discovery.sync.queue.start, {
    organizationId: "org",
    lane: "text",
  })
  const queues = await t.run((ctx) => ctx.db.query("discoveryQueues").collect())
  expect(queues).toHaveLength(2)
  const lease = queues[0].lease
  await t.mutation(internal.discovery.sync.queue.start, {
    organizationId: "org",
    lane: "text",
  })
  expect(
    (await t.run((ctx) => ctx.db.query("discoveryQueues").collect())).every(
      (q) => q.lease === lease
    )
  ).toBe(true)
})
test("old acknowledgments cannot clear newer edits; a failed source remains retryable after six attempts", async () => {
  const t = await fixture()
  await t.run((ctx) => raise(ctx, "org", "documents:one"))
  await t.run((ctx) => raise(ctx, "org", "documents:one"))
  await t.mutation(internal.discovery.sync.state.finish, {
    key: "documents:one",
    generation: 1,
    parts: 0,
  })
  expect(
    (await t.run((ctx) => ctx.db.query("discoverySources").first()))?.pending
  ).toBe(true)
  for (let i = 0; i < 8; i++) {
    await t.mutation(internal.discovery.sync.state.failed, {
      key: "documents:one",
      generation: 2,
    })
  }
  const row = await t.run((ctx) => ctx.db.query("discoverySources").first())
  expect(row).toMatchObject({ pending: true, attempts: 8 })
  expect(row?.nextAt).toBeGreaterThan(Date.now())
})

test("expiry drains bounded pages without a deleting workspace blocking later traces", async () => {
  const t = await fixture()
  await t.run(async (ctx) => {
    await ctx.db.insert("workspaceRetention", {
      organizationId: "deleting",
      state: "deleting",
      endedAt: 1,
      deletesAt: 1,
    })
    for (let i = 0; i < 51; i++) {
      await ctx.db.insert("discoverySources", {
        organizationId: i < 50 ? "deleting" : "org",
        key: `traces:${i}`,
        lane: "text",
        generation: 1,
        pending: false,
        nextAt: 0,
        attempts: 0,
        raisedAt: 1,
        expiresAt: i + 1,
      })
    }
  })
  await t.mutation(internal.discovery.sync.sweep.expire, {})
  expect(
    await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect())
  ).toHaveLength(1)
  await t.mutation(internal.discovery.sync.sweep.expire, {})
  const sources = await t.run((ctx) =>
    ctx.db.query("discoverySources").collect()
  )
  expect(sources.every((source) => source.expiresAt === undefined)).toBe(true)
  expect(
    sources.filter((source) => source.pending).map((source) => source.key)
  ).toEqual(["traces:50"])
})

test("reconciliation prunes legacy acknowledged trace tombstones without recreating work", async () => {
  const t = await fixture()
  await t.run(async (ctx) => {
    await ctx.db.insert("discoverySources", {
      organizationId: "org",
      key: "traces:removed",
      lane: "text",
      generation: 1,
      pending: false,
      nextAt: 0,
      attempts: 0,
      raisedAt: 1,
      parts: 0,
    })
    await ctx.db.insert("discoveryScans", {
      name: "sources",
      table: sourceTables.length,
      cursor: null,
      nextAt: 0,
    })
  })
  await t.mutation(internal.discovery.sync.sweep.page, {})
  expect(
    await t.run((ctx) => ctx.db.query("discoverySources").first())
  ).toBeNull()
  expect(
    await t.run((ctx) => ctx.db.query("discoveryQueues").first())
  ).toBeNull()
})
