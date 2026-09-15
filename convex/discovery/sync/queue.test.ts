// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"
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
