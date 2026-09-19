// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"
import { queueCancellation } from "./cancellation"
import { polarEnvironmentNames } from "./config"

const modules = import.meta.glob("/convex/{_generated,billing}/**/*.{ts,js}")
const subscription = {
  id: "sub_late",
  customer_id: "customer_org",
  status: "active",
  metadata: { region: "eu", organizationId: "org" },
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

async function setup() {
  vi.useFakeTimers()
  vi.stubEnv("JORI_REGION", "eu")
  for (const name of polarEnvironmentNames) {
    vi.stubEnv(name, "fixture")
  }
  vi.stubEnv("POLAR_SERVER", "sandbox")
  const t = convexTest(schema, modules)
  const accountId = await t.run(
    async (ctx) =>
      await ctx.db.insert("accounts", {
        organizationId: "org",
        state: { kind: "paused" },
        micros: { allowance: 0, wallet: 0 },
        topUp: { charged: { micros: 0 } },
        polar: { customerId: "customer_org", subscriptionId: "sub_unrelated" },
        updatedAt: 0,
      })
  )
  const late = {
    organizationId: "org",
    customerId: "customer_org",
    subscriptionId: "sub_late",
    orderId: "order_late",
  }
  await t.run(async (ctx) => {
    await queueCancellation(ctx, late)
    await queueCancellation(ctx, late)
  })
  const rows = await t.run(
    async (ctx) => await ctx.db.query("billingCancellations").take(10)
  )
  expect(rows).toHaveLength(1)
  return { t, accountId, id: rows[0]._id }
}

function polarFixture(change: Record<string, unknown> = {}) {
  const fetch = vi.fn(async (input: URL, init?: RequestInit) => {
    if (input.pathname === "/v1/orders/order_late") {
      return Response.json({
        id: "order_late",
        subscription_id: "sub_late",
        customer_id: "customer_org",
        paid: true,
        metadata: subscription.metadata,
      })
    }
    expect(input.pathname).toBe("/v1/subscriptions/sub_late")
    return Response.json({
      ...subscription,
      ...(init?.method === "DELETE" ? { status: "canceled" } : {}),
      ...change,
    })
  })
  vi.stubGlobal("fetch", fetch)
  return fetch
}

test("cancels only the verified late subscription, preserves accounting and safely retries", async () => {
  const { t, id, accountId } = await setup()
  const fetch = polarFixture()
  await t.action(internal.billing.polar.late.cancel, { id })
  await t.action(internal.billing.polar.late.cancel, { id })
  expect(fetch.mock.calls.map((call) => call[1]?.method)).toEqual([
    "GET",
    "GET",
    "DELETE",
  ])
  expect(
    await t.query(internal.billing.polar.cancellation.read, { id })
  ).toMatchObject({
    orderId: "order_late",
    subscriptionId: "sub_late",
    canceledAt: expect.any(Number),
  })
  expect(
    (await t.run(async (ctx) => await ctx.db.get(accountId)))?.polar
      ?.subscriptionId
  ).toBe("sub_unrelated")
})

test("already canceled Polar subscription completes the audit without another mutation", async () => {
  const { t, id } = await setup()
  const fetch = polarFixture({ status: "canceled" })
  await t.action(internal.billing.polar.late.cancel, { id })
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(
    (await t.query(internal.billing.polar.cancellation.read, { id }))
      ?.canceledAt
  ).toBeDefined()
})

test("mismatched ownership remains visible and is retried without canceling anything", async () => {
  const { t, id } = await setup()
  const fetch = polarFixture({ customer_id: "customer_unrelated" })
  await t.action(internal.billing.polar.late.cancel, { id })
  const pending = await t.query(internal.billing.polar.cancellation.read, {
    id,
  })
  expect(pending?.error).toContain("does not match")
  expect(pending?.canceledAt).toBeUndefined()
  expect(fetch.mock.calls.map((call) => call[1]?.method)).toEqual([
    "GET",
    "GET",
  ])
  await t.run(async (ctx) => await ctx.db.patch(id, { nextAt: Date.now() - 1 }))
  await t.mutation(internal.billing.polar.cancellation.retry, {})
  expect(
    (await t.query(internal.billing.polar.cancellation.read, { id }))?.nextAt
  ).toBeGreaterThan(Date.now())
})

test("cancellation retries retain only the HTTP status from provider failures", async () => {
  const { t, id } = await setup()
  const fetch = vi.fn(async () =>
    Response.json(
      { error: { message: "Reflected private customer value" } },
      { status: 401 }
    )
  )
  vi.stubGlobal("fetch", fetch)
  await t.action(internal.billing.polar.late.cancel, { id })
  const pending = await t.query(internal.billing.polar.cancellation.read, {
    id,
  })
  expect(pending?.error).toBe("Polar request failed (HTTP 401)")
  expect(pending?.canceledAt).toBeUndefined()
  expect(pending?.nextAt).toBeGreaterThan(Date.now())
  expect(fetch).toHaveBeenCalledTimes(1)
})
