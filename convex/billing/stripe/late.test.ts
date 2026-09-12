// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"
import { queueCancellation } from "./cancellation"
import { stripeEnvironmentNames } from "./config"

const modules = import.meta.glob("/convex/{_generated,billing}/**/*.{ts,js}")
const subscription = {
  id: "sub_late",
  customer: "cus_org",
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
  for (const name of stripeEnvironmentNames) {
    vi.stubEnv(name, "fixture")
  }
  const t = convexTest(schema, modules)
  const accountId = await t.run(
    async (ctx) =>
      await ctx.db.insert("accounts", {
        organizationId: "org",
        state: { kind: "paused", plan: "starter", interval: "month" },
        micros: { allowance: 0, wallet: 0 },
        topUp: { charged: { micros: 0 } },
        stripe: { customerId: "cus_org", subscriptionId: "sub_unrelated" },
        updatedAt: 0,
      })
  )
  await t.run(async (ctx) => {
    const account = await ctx.db.get(accountId)
    if (account === null) {
      throw new Error("Missing fixture")
    }
    await queueCancellation(ctx, account, "sub_late", "cs_late")
    await queueCancellation(ctx, account, "sub_late", "cs_late")
  })
  const rows = await t.run(
    async (ctx) => await ctx.db.query("billingCancellations").take(10)
  )
  expect(rows).toHaveLength(1)
  return { t, accountId, id: rows[0]._id }
}

function stripeFixture(change: Record<string, unknown> = {}) {
  const fetch = vi.fn(async (input: string, init?: RequestInit) => {
    const path = new URL(input).pathname
    if (path === "/v1/checkout/sessions/cs_late") {
      return new Response(
        JSON.stringify({
          id: "cs_late",
          subscription: "sub_late",
          customer: "cus_org",
          payment_status: "paid",
          metadata: subscription.metadata,
        }),
        { status: 200 }
      )
    }
    expect(path).toBe("/v1/subscriptions/sub_late")
    if (init?.method === "DELETE") {
      expect(new URLSearchParams(String(init.body)).get("invoice_now")).toBe(
        "false"
      )
      expect(new URLSearchParams(String(init.body)).get("prorate")).toBe(
        "false"
      )
    }
    return new Response(
      JSON.stringify({
        ...subscription,
        ...(init?.method === "DELETE" ? { status: "canceled" } : {}),
        ...change,
      }),
      { status: 200 }
    )
  })
  vi.stubGlobal("fetch", fetch)
  return fetch
}

test("cancels only the verified late subscription, preserves accounting and safely retries", async () => {
  const { t, id, accountId } = await setup()
  const fetch = stripeFixture()
  await t.action(internal.billing.stripe.late.cancel, { id })
  await t.action(internal.billing.stripe.late.cancel, { id })
  expect(fetch.mock.calls.map((call) => call[1]?.method)).toEqual([
    "GET",
    "GET",
    "DELETE",
  ])
  expect(
    await t.query(internal.billing.stripe.cancellation.read, { id })
  ).toMatchObject({
    sessionId: "cs_late",
    subscriptionId: "sub_late",
    canceledAt: expect.any(Number),
  })
  expect(
    (await t.run(async (ctx) => await ctx.db.get(accountId)))?.stripe
      ?.subscriptionId
  ).toBe("sub_unrelated")
})

test("already canceled Stripe subscription completes the audit without another mutation", async () => {
  const { t, id } = await setup()
  const fetch = stripeFixture({ status: "canceled" })
  await t.action(internal.billing.stripe.late.cancel, { id })
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(
    (await t.query(internal.billing.stripe.cancellation.read, { id }))
      ?.canceledAt
  ).toBeDefined()
})

test("mismatched ownership remains visible and is retried without canceling anything", async () => {
  const { t, id } = await setup()
  const fetch = stripeFixture({ customer: "cus_unrelated" })
  await t.action(internal.billing.stripe.late.cancel, { id })
  const pending = await t.query(internal.billing.stripe.cancellation.read, {
    id,
  })
  expect(pending?.error).toContain("does not match")
  expect(pending?.canceledAt).toBeUndefined()
  expect(fetch.mock.calls.map((call) => call[1]?.method)).toEqual([
    "GET",
    "GET",
  ])
  await t.run(async (ctx) => await ctx.db.patch(id, { nextAt: Date.now() - 1 }))
  await t.mutation(internal.billing.stripe.cancellation.retry, {})
  expect(
    (await t.query(internal.billing.stripe.cancellation.read, { id }))?.nextAt
  ).toBeGreaterThan(Date.now())
})
