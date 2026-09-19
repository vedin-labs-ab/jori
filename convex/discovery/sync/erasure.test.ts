// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"

const mocks = vi.hoisted(() => ({ erase: vi.fn() }))
vi.mock("../provider", () => ({ erase: mocks.erase }))
const modules = import.meta.glob("/convex/**/*.{ts,js}")
afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})
test("workspace purge waits for acknowledged search deletion and retries provider failures", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, modules)
  const id = await t.run(async (ctx) => {
    await ctx.db.insert("discoverySources", {
      organizationId: "org",
      key: "files:one",
      lane: "file",
      generation: 1,
      pending: false,
      nextAt: 0,
      attempts: 0,
      raisedAt: 1,
    })
    return ctx.db.insert("workspaceRetention", {
      organizationId: "org",
      state: "deleting",
      endedAt: 1,
      deletesAt: 1,
      startedAt: Date.now() - 36 * 60_000,
      stage: 6,
    })
  })
  mocks.erase.mockRejectedValueOnce(new Error("Temporary provider failure"))
  await t.action(internal.discovery.sync.erasure.run, { id })
  const waiting = await t.run((ctx) => ctx.db.get(id))
  expect(waiting?.discoveryErasedAt).toBeUndefined()
  expect(waiting?.state).toBe("deleting")
  expect(waiting?.waiting).toBe(
    "Search deletion is waiting for the regional service."
  )
  expect(
    await t.run((ctx) => ctx.db.query("discoverySources").collect())
  ).toHaveLength(1)
  mocks.erase.mockResolvedValueOnce(undefined)
  await t.action(internal.discovery.sync.erasure.run, { id })
  expect((await t.run((ctx) => ctx.db.get(id)))?.discoveryErasedAt).toBe(
    Date.now()
  )
  expect(mocks.erase).toHaveBeenCalledTimes(2)
})
