// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

async function setup(count: number) {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const personId = await ctx.db.insert("persons", {
      organizationId: "org",
      createdAt: 0,
      updatedAt: 0,
    })
    const integrationId = await ctx.db.insert("integrations", {
      integration: "slack",
      externalId: "TTEST",
      organizationId: "org",
      scope: "organization",
      status: "active",
      credentials: {},
      createdBy: personId,
      createdAt: 0,
      updatedAt: 0,
    })
    return await Promise.all(
      Array.from({ length: count }, (_, index) =>
        ctx.db.insert("webhookDeliveries", {
          provider: "slack",
          eventId: `event-${index}`,
          integrationId,
          organizationId: "org",
          connectionGeneration: 0,
          status: "queued",
          payload: { text: "Expired test content" },
          attempts: 0,
          dueAt: Date.now(),
          expiresAt: Date.now(),
        })
      )
    )
  })
  return { t, ids }
}

test("an expired receipt cannot be claimed before the cleanup cron runs", async () => {
  const { t, ids } = await setup(1)
  expect(
    await t.mutation(internal.integrations.webhooks.delivery.claim, {
      id: ids[0],
    })
  ).toBeNull()
  expect(await t.run(async (ctx) => await ctx.db.get(ids[0]))).toBeNull()
})

test("expired payload cleanup continues across full batches", async () => {
  const { t } = await setup(205)
  await t.mutation(internal.integrations.webhooks.delivery.clean, {})
  expect(
    await t.run(
      async (ctx) => await ctx.db.query("webhookDeliveries").collect()
    )
  ).toHaveLength(105)
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  expect(
    await t.run(
      async (ctx) => await ctx.db.query("webhookDeliveries").collect()
    )
  ).toHaveLength(0)
})
