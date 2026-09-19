// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { storage } from "../../../contracts/billing"
import { internal } from "../../_generated/api"
import schema from "../../schema"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const organizationId = "storage-test"
const now = "2026-09-19T12:00:00Z"

beforeEach(() => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("POLAR_PRODUCT_STORAGE", "product_storage")
  vi.stubEnv("POLAR_PRODUCT_CLOUD", "product_cloud")
  vi.stubEnv("POLAR_PRODUCT_TOP_UP", "product_topup")
  vi.useFakeTimers()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

async function fixture() {
  const t = convexTest(schema, modules)
  const id = await t.run(
    async (ctx) =>
      await ctx.db.insert("accounts", {
        organizationId,
        state: { kind: "active" },
        polar: {
          customerId: "customer_storage",
          subscriptionId: "base_subscription",
        },
        micros: { allowance: 20_000_000, wallet: 15_000_000 },
        topUp: { charged: { micros: 0 } },
        updatedAt: 0,
      })
  )
  return { t, id, account: () => t.run(async (ctx) => await ctx.db.get(id)) }
}
function subscription(extra: Record<string, unknown> = {}) {
  return {
    id: "storage_subscription",
    customer_id: "customer_storage",
    product_id: "product_storage",
    status: "active",
    currency: "usd",
    recurring_interval: "month",
    recurring_interval_count: 1,
    units: 40,
    modified_at: now,
    current_period_end: "2026-10-19T12:00:00Z",
    metadata: { organizationId, region: "eu", extraGb: "9999999" },
    ...extra,
  }
}
function order(extra: Record<string, unknown> = {}) {
  return {
    id: "storage_order",
    paid: true,
    currency: "usd",
    net_amount: 1000,
    product_id: "product_storage",
    customer_id: "customer_storage",
    subscription_id: "storage_subscription",
    billing_reason: "subscription_create",
    metadata: { organizationId, region: "eu" },
    subscription: subscription(),
    ...extra,
  }
}

test("paid storage adds verified units once without touching wallet, plan or allowance", async () => {
  const { t, account } = await fixture()
  await t.mutation(internal.billing.polar.events.apply, { order: order() })
  await t.mutation(internal.billing.polar.events.apply, { order: order() })
  expect(await account()).toMatchObject({
    storage: {
      extraGb: 40,
      subscriptionId: "storage_subscription",
      purchaseOrderId: "storage_order",
    },
    micros: { allowance: 20_000_000, wallet: 15_000_000 },
    polar: { subscriptionId: "base_subscription" },
    state: { kind: "active" },
  })
  expect(
    await t.run(async (ctx) => await ctx.db.query("transactions").take(10))
  ).toEqual([])
})

test.each([
  { paid: false },
  { customer_id: "other" },
  { metadata: { organizationId, region: "us" } },
  { subscription: subscription({ customer_id: "other" }) },
  {
    subscription: subscription({
      metadata: { organizationId: "other", region: "eu" },
    }),
  },
  {
    subscription: subscription({ metadata: { organizationId, region: "us" } }),
  },
  { subscription: subscription({ units: 0 }) },
  { subscription: subscription({ units: 4.5 }) },
  { subscription: subscription({ units: storage.maximumExtraGb + 1 }) },
  { subscription: subscription({ status: "canceled" }) },
  { subscription: subscription({ recurring_interval: "year" }) },
  { subscription: subscription({ currency: "eur" }) },
  { subscription: subscription({ product_id: "other" }) },
  { subscription: subscription({ modified_at: null }) },
])(
  "invalid or unrelated storage orders cannot grant capacity: %j",
  async (extra) => {
    const { t, account } = await fixture()
    await t.mutation(internal.billing.polar.events.apply, {
      order: order(extra),
    })
    expect((await account())?.storage).toBeUndefined()
  }
)

test("a subscription webhook cannot attach unpaid storage", async () => {
  const { t, account } = await fixture()
  await t.mutation(internal.billing.polar.events.apply, {
    subscription: subscription(),
  })
  expect((await account())?.storage).toBeUndefined()
})

test("downgrades and cancellation retain paid capacity until effective expiry", async () => {
  const { t, account } = await fixture()
  await t.mutation(internal.billing.polar.events.apply, { order: order() })
  await t.mutation(internal.billing.polar.events.apply, {
    subscription: subscription({ pending_update: { units: 4 } }),
  })
  expect((await account())?.storage).toMatchObject({
    extraGb: 40,
    pendingGb: 4,
  })
  await t.mutation(internal.billing.polar.events.apply, {
    subscription: subscription({ cancel_at_period_end: true }),
  })
  expect((await account())?.storage).toMatchObject({
    extraGb: 40,
    pendingGb: 0,
  })
  await t.mutation(internal.billing.polar.events.apply, {
    subscription: subscription({
      status: "canceled",
      modified_at: "2026-10-19T12:00:00Z",
    }),
  })
  expect((await account())?.storage).toBeUndefined()
  await t.mutation(internal.billing.polar.events.apply, { order: order() })
  expect((await account())?.storage).toBeUndefined()
})

test("newer provider state wins when concurrent snapshots arrive out of order", async () => {
  const { t, account } = await fixture()
  await t.mutation(internal.billing.polar.events.apply, { order: order() })
  await t.mutation(internal.billing.polar.events.apply, {
    subscription: subscription({
      units: 80,
      modified_at: "2026-09-19T13:00:00Z",
    }),
  })
  await t.mutation(internal.billing.polar.events.apply, {
    subscription: subscription(),
  })
  expect((await account())?.storage?.extraGb).toBe(80)
})

test("a failed renewal cannot grow capacity or touch prepaid usage", async () => {
  const { t, account } = await fixture()
  await t.mutation(internal.billing.polar.events.apply, { order: order() })
  await t.mutation(internal.billing.polar.events.apply, {
    subscription: subscription({ status: "past_due", units: 80 }),
  })
  expect((await account())?.storage?.extraGb).toBe(40)
})

test("a duplicate paid checkout is canceled without replacing existing storage", async () => {
  const { t, account } = await fixture()
  await t.mutation(internal.billing.polar.events.apply, { order: order() })
  await t.mutation(internal.billing.polar.events.apply, {
    order: order({
      id: "duplicate_order",
      subscription_id: "duplicate",
      subscription: subscription({ id: "duplicate", units: 80 }),
    }),
  })
  expect((await account())?.storage?.subscriptionId).toBe(
    "storage_subscription"
  )
  expect(
    await t.run(
      async (ctx) => await ctx.db.query("billingCancellations").take(10)
    )
  ).toMatchObject([{ subscriptionId: "duplicate", orderId: "duplicate_order" }])
})

test("late checkout during a refund hold queues durable cancellation and grants nothing", async () => {
  const { t, id, account } = await fixture()
  await t.run(
    async (ctx) => await ctx.db.patch(id, { refundHold: "support-test" })
  )
  await t.mutation(internal.billing.polar.events.apply, { order: order() })
  expect((await account())?.storage).toBeUndefined()
  expect(
    await t.run(
      async (ctx) => await ctx.db.query("billingCancellations").take(10)
    )
  ).toMatchObject([{ subscriptionId: "storage_subscription" }])
})

test("ending the base subscription stops extra storage renewal through durable cancellation", async () => {
  const { t, account } = await fixture()
  await t.mutation(internal.billing.polar.events.apply, { order: order() })
  await t.mutation(internal.billing.polar.events.apply, {
    subscription: subscription({
      id: "base_subscription",
      product_id: "product_cloud",
      status: "canceled",
    }),
  })
  expect((await account())?.storage).toMatchObject({ extraGb: 0, pendingGb: 0 })
  expect(
    await t.run(
      async (ctx) => await ctx.db.query("billingCancellations").take(10)
    )
  ).toMatchObject([
    { subscriptionId: "storage_subscription", orderId: "storage_order" },
  ])
})
