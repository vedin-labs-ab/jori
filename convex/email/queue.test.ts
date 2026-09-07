// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { internal } from "../_generated/api"
import schema from "../schema"
import { leaseMs, retentionMs, retryWindowMs } from "./policy"

const modules = import.meta.glob("/convex/{_generated,email}/**/*.{ts,js}")
const message = {
  to: "test@usejori.com",
  subject: "Welcome",
  html: "<p>Hi</p>",
  text: "Hi",
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv("JORI_REGION", "eu")
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

test("outbox claim is exclusive and acceptance erases content", async () => {
  const t = convexTest(schema, modules)
  const id = await t.mutation(internal.email.queue.enqueue, { message })
  const claimed = await t.mutation(internal.email.queue.claim, { id })
  expect(claimed?.region).toBe("eu")
  expect(await t.mutation(internal.email.queue.claim, { id })).toBeNull()
  await t.mutation(internal.email.queue.finish, {
    id,
    attempt: 1,
    result: { kind: "accepted", providerId: "em_1" },
  })
  const row = await t.run(async (ctx) => await ctx.db.get(id))
  expect(row).toMatchObject({ status: "accepted", providerId: "em_1" })
  expect(row?.message).toBeUndefined()
  expect(row?.dueAt).toBeUndefined()
})

test("an interrupted send is recovered only within the deduplication window", async () => {
  const t = convexTest(schema, modules)
  const id = await t.mutation(internal.email.queue.enqueue, { message })
  await t.mutation(internal.email.queue.claim, { id })
  vi.setSystemTime(Date.now() + retryWindowMs)
  expect(await t.mutation(internal.email.queue.claim, { id })).toBeNull()
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toMatchObject({
    status: "uncertain",
    failure: "retry_window_closed",
  })
})

test("permanent submission failure erases content", async () => {
  const t = convexTest(schema, modules)
  const id = await t.mutation(internal.email.queue.enqueue, { message })
  await t.mutation(internal.email.queue.claim, { id })
  await t.mutation(internal.email.queue.finish, {
    id,
    attempt: 1,
    result: { kind: "failed", failure: "http_422" },
  })
  const row = await t.run(async (ctx) => await ctx.db.get(id))
  expect(row).toMatchObject({ status: "failed", failure: "http_422" })
  expect(row?.message).toBeUndefined()
  expect(row?.dueAt).toBeUndefined()
})

test("a stale attempt cannot overwrite a recovered submission", async () => {
  const t = convexTest(schema, modules)
  const id = await t.mutation(internal.email.queue.enqueue, { message })
  await t.mutation(internal.email.queue.claim, { id })
  vi.setSystemTime(Date.now() + leaseMs)
  expect(await t.mutation(internal.email.queue.claim, { id })).toMatchObject({
    attempts: 2,
  })
  await t.mutation(internal.email.queue.finish, {
    id,
    attempt: 1,
    result: { kind: "failed", failure: "http_422" },
  })
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toMatchObject({
    status: "sending",
    attempts: 2,
  })
})

test("a retry respects Bird's throttle before it can be claimed", async () => {
  const t = convexTest(schema, modules)
  const id = await t.mutation(internal.email.queue.enqueue, { message })
  await t.mutation(internal.email.queue.claim, { id })
  await t.mutation(internal.email.queue.finish, {
    id,
    attempt: 1,
    result: { kind: "retry", failure: "http_429", retryAfterMs: 120_000 },
  })
  expect(await t.mutation(internal.email.queue.claim, { id })).toBeNull()
  vi.setSystemTime(Date.now() + 120_000)
  expect(await t.mutation(internal.email.queue.claim, { id })).toMatchObject({
    attempts: 2,
    message,
  })
})

test("maintenance removes expired submission records", async () => {
  const t = convexTest(schema, modules)
  const id = await t.mutation(internal.email.queue.enqueue, { message })
  vi.setSystemTime(Date.now() + retentionMs)
  await t.mutation(internal.email.maintenance.sweep, {})
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toBeNull()
})
