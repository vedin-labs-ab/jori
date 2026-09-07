// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { internal } from "../../../_generated/api"
import schema from "../../../schema"

const modules = import.meta.glob(
  "/convex/{_generated,integrations/notion/setup}/**/*.{ts,js}"
)
const setup = internal.integrations.notion.setup.index
const token = "secret_synthetic_verification_value"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test("does not persist unsolicited verification tokens", async () => {
  const t = convexTest(schema, modules)
  await t.mutation(setup.capture, { token })
  expect(
    await t.run(
      async (ctx) => await ctx.db.query("notionWebhookSetups").unique()
    )
  ).toBeNull()
})

test("captures only the first valid candidate in an armed slot", async () => {
  const t = convexTest(schema, modules)
  const id = await t.mutation(setup.begin, {})
  await t.mutation(setup.capture, { token: "invalid" })
  expect(await t.query(setup.read, { id })).toBeNull()
  await t.mutation(setup.capture, { token })
  await t.mutation(setup.capture, { token: `${token}_different` })
  expect(await t.query(setup.read, { id })).toBe(token)
  await t.mutation(setup.clear, { id })
  expect(await t.query(setup.read, { id })).toBeNull()
})

test("expired slots cannot capture or reveal a token", async () => {
  const t = convexTest(schema, modules)
  const id = await t.mutation(setup.begin, {})
  vi.setSystemTime(Date.now() + 10 * 60 * 1000)
  await t.mutation(setup.capture, { token })
  expect(await t.query(setup.read, { id })).toBeNull()
  const row = await t.run(async (ctx) => await ctx.db.get(id))
  expect(row?.token).toBeUndefined()
})

test("expiry cleanup removes captured secrets and cannot clear a replacement", async () => {
  const t = convexTest(schema, modules)
  const old = await t.mutation(setup.begin, {})
  await t.mutation(setup.capture, { token })
  const id = await t.mutation(setup.begin, {})
  await t.mutation(setup.clear, { id: old })
  await t.mutation(setup.capture, { token })
  expect(await t.query(setup.read, { id })).toBe(token)
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toBeNull()
})
