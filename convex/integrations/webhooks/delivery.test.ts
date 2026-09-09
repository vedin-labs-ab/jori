// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, assert, beforeEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"
import {
  webhookLeaseMs,
  webhookMaxAttempts,
  webhookRetentionMs,
} from "./policy"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const receipt = {
  provider: "slack" as const,
  externalId: "TTEST",
  eventId: "EvTEST",
  payload: { text: "Private test content" },
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

async function setup() {
  const t = convexTest(schema, modules)
  const integrationId = await t.run(async (ctx) => {
    const createdBy = await ctx.db.insert("persons", {
      organizationId: "org",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return await ctx.db.insert("integrations", {
      organizationId: "org",
      integration: "slack",
      scope: "organization",
      externalId: "TTEST",
      credentials: {},
      status: "active",
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
  return { t, integrationId }
}

test("acceptance deduplicates before scheduling and completion erases the payload", async () => {
  const { t, integrationId } = await setup()
  const result = await t.mutation(
    internal.integrations.webhooks.delivery.accept,
    receipt
  )
  expect(result.status).toBe("accepted")
  assert(result.id)
  const id = result.id
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.accept, receipt)
  ).toEqual({ status: "duplicate", id })
  expect(
    await t.run(
      async (ctx) => await ctx.db.system.query("_scheduled_functions").collect()
    )
  ).toHaveLength(1)
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.claim, { id })
  ).toMatchObject({ integrationId, organizationId: "org", attempts: 1 })
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.claim, { id })
  ).toBeNull()
  await t.mutation(internal.integrations.webhooks.delivery.finish, {
    id,
    attempt: 1,
    succeeded: true,
  })
  const row = await t.run(async (ctx) => await ctx.db.get(id))
  expect(row).toMatchObject({ status: "completed" })
  expect(row?.payload).toBeUndefined()
  expect(row?.dueAt).toBeUndefined()
})

test("unknown and disconnected regional accounts do not retain payloads", async () => {
  const { t, integrationId } = await setup()
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.accept, {
      ...receipt,
      externalId: "TOTHER",
    })
  ).toEqual({ status: "missing_integration" })
  await t.run(
    async (ctx) => await ctx.db.patch(integrationId, { status: "disconnected" })
  )
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.accept, receipt)
  ).toEqual({ status: "missing_integration" })
  expect(
    await t.run(
      async (ctx) => await ctx.db.query("webhookDeliveries").collect()
    )
  ).toHaveLength(0)
})

test("a pending delivery cannot run after its tenant binding changes", async () => {
  const { t, integrationId } = await setup()
  const { id } = await t.mutation(
    internal.integrations.webhooks.delivery.accept,
    receipt
  )
  assert(id)
  await t.run(
    async (ctx) =>
      await ctx.db.patch(integrationId, { organizationId: "other-org" })
  )
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.claim, { id: id })
  ).toBeNull()
  const row = await t.run(async (ctx) => await ctx.db.get(id))
  expect(row?.status).toBe("inactive")
  expect(row?.payload).toBeUndefined()
})

test("an interrupted worker is recovered and its stale completion cannot overwrite the retry", async () => {
  const { t } = await setup()
  const { id } = await t.mutation(
    internal.integrations.webhooks.delivery.accept,
    receipt
  )
  assert(id)
  await t.mutation(internal.integrations.webhooks.delivery.claim, { id: id })
  vi.setSystemTime(Date.now() + webhookLeaseMs)
  await t.mutation(internal.integrations.webhooks.delivery.sweep, {})
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.claim, { id: id })
  ).toMatchObject({ attempts: 2 })
  await t.mutation(internal.integrations.webhooks.delivery.finish, {
    id: id,
    attempt: 1,
    succeeded: true,
  })
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toMatchObject({
    status: "processing",
    attempts: 2,
    payload: receipt.payload,
  })
})

test("reconnecting an existing row invalidates deliveries accepted under the previous grant", async () => {
  const { t, integrationId } = await setup()
  const { id } = await t.mutation(
    internal.integrations.webhooks.delivery.accept,
    receipt
  )
  assert(id)
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toMatchObject({
    connectionGeneration: 0,
  })
  await t.run(
    async (ctx) =>
      await ctx.db.patch(integrationId, { connectionGeneration: 1 })
  )
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.claim, { id })
  ).toBeNull()
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toMatchObject({
    status: "inactive",
  })
  const fresh = await t.mutation(
    internal.integrations.webhooks.delivery.accept,
    { ...receipt, eventId: "EvFRESH" }
  )
  assert(fresh.id)
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.claim, {
      id: fresh.id,
    })
  ).toMatchObject({ connectionGeneration: 1 })
})

test("retry exhaustion retains a replayable regional payload without exposing it in failures", async () => {
  const { t } = await setup()
  const { id } = await t.mutation(
    internal.integrations.webhooks.delivery.accept,
    receipt
  )
  assert(id)
  await t.run(
    async (ctx) => await ctx.db.patch(id, { attempts: webhookMaxAttempts - 1 })
  )
  await t.mutation(internal.integrations.webhooks.delivery.claim, { id: id })
  await t.mutation(internal.integrations.webhooks.delivery.finish, {
    id: id,
    attempt: webhookMaxAttempts,
    succeeded: false,
  })
  const failed = await t.run(async (ctx) => await ctx.db.get(id))
  expect(failed).toMatchObject({ status: "failed", payload: receipt.payload })
  expect(failed?.dueAt).toBeUndefined()
  const failures = await t.query(
    internal.integrations.webhooks.delivery.failures,
    {}
  )
  expect(failures).toHaveLength(1)
  expect(failures[0]).not.toHaveProperty("payload")
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.retry, { id: id })
  ).toBe(true)
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.claim, { id: id })
  ).toMatchObject({ attempts: 1, payload: receipt.payload })
})

test("provider failures retry with a delay and receipts expire after seven days", async () => {
  const { t } = await setup()
  const { id } = await t.mutation(
    internal.integrations.webhooks.delivery.accept,
    receipt
  )
  assert(id)
  await t.mutation(internal.integrations.webhooks.delivery.claim, { id: id })
  await t.mutation(internal.integrations.webhooks.delivery.finish, {
    id: id,
    attempt: 1,
    succeeded: false,
  })
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.claim, { id: id })
  ).toBeNull()
  vi.setSystemTime(Date.now() + 5_000)
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.claim, { id: id })
  ).toMatchObject({ attempts: 2 })
  vi.setSystemTime(Date.now() + webhookRetentionMs)
  await t.mutation(internal.integrations.webhooks.delivery.sweep, {})
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toBeNull()
})
