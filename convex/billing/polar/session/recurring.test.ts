// @vitest-environment edge-runtime
import { expect, test } from "vitest"
import {
  checkout,
  fixture,
  lists,
  organizationId,
  posts,
  provider,
  requests,
} from "../../../../test/convex/billing"
import { internal } from "../../../_generated/api"

test.each(["plan", "storage"] as const)(
  "concurrent and repeated %s purchases share one payable checkout",
  async (kind) => {
    const f = await fixture(kind === "storage")
    const results = await Promise.allSettled([f[kind](), f[kind](), f[kind]()])
    expect(results.some((result) => result.status === "fulfilled")).toBe(true)
    expect(posts()).toHaveLength(1)
    const first = await f[kind]()
    expect(await f[kind]()).toEqual(first)
    expect(posts()).toHaveLength(1)
  }
)

test("storage units change on the same checkout while top-ups remain repeatable", async () => {
  const f = await fixture(true)
  const first = await f.storage(30)
  expect(await f.storage(60)).toEqual(first)
  expect(provider.checkouts[0]?.units).toBe(60)
  expect(posts()).toHaveLength(1)
  const [a, b] = await Promise.all([f.topup(), f.topup()])
  expect(a.url).not.toBe(b.url)
  expect(posts()).toHaveLength(3)
})

test("lost POST response recovers its metadata-matched checkout without another charge opportunity", async () => {
  const f = await fixture()
  provider.lostResponse = true
  await expect(f.plan()).rejects.toThrow("Connection lost")
  provider.lostResponse = false
  expect(await f.plan()).toEqual({ url: "https://polar.test/0" })
  expect(posts()).toHaveLength(1)
})

test("missing uncertain checkout stays reserved even long after a failed request", async () => {
  const f = await fixture()
  requests.mockRejectedValueOnce(new Error("Timeout"))
  await expect(f.plan()).rejects.toThrow("Timeout")
  await expect(f.plan()).rejects.toThrow("contact support")
  await expect(f.plan()).rejects.toThrow("contact support")
  expect(posts()).toHaveLength(1)
})

test.each(["expired", "failed"])(
  "provider-confirmed %s checkout permits exactly one replacement",
  async (status) => {
    const f = await fixture()
    await f.plan()
    checkout().status = status
    await Promise.allSettled([f.plan(), f.plan()])
    expect(posts()).toHaveLength(2)
    expect(await f.plan()).toEqual({ url: "https://polar.test/1" })
  }
)

test.each(["confirmed", "succeeded", "unknown"])(
  "%s checkout never permits a replacement while payment is unresolved",
  async (status) => {
    const f = await fixture()
    await f.plan()
    checkout().status = status
    await expect(f.plan()).rejects.toThrow("payment is pending")
    expect(posts()).toHaveLength(1)
  }
)

test("a completed checkout recovers only after its exact subscription has ended", async () => {
  const f = await fixture()
  await f.plan()
  checkout().status = "succeeded"
  const subscription = {
    product_id: "plan_product",
    checkout_id: "other",
    status: "canceled",
    customer_id: "customer",
    metadata: { organizationId, region: "eu" },
  }
  provider.subscriptions = [subscription]
  await expect(f.plan()).rejects.toThrow("payment is pending")
  subscription.checkout_id = String(checkout().id)
  subscription.status = "active"
  await expect(f.plan()).rejects.toThrow("payment is pending")
  subscription.status = "canceled"
  await f.plan()
  expect(posts()).toHaveLength(2)
})

test("an open checkout predating reservations is adopted rather than duplicated", async () => {
  const f = await fixture()
  provider.checkouts.push({
    id: "legacy",
    product_id: "plan_product",
    customer_id: "customer",
    status: "open",
    url: "https://polar.test/legacy",
    metadata: { organizationId, kind: "plan", region: "eu" },
  })
  expect(await f.plan()).toEqual({ url: "https://polar.test/legacy" })
  expect(posts()).toHaveLength(0)
})

test("provider subscription not yet fulfilled blocks another purchase", async () => {
  const f = await fixture()
  provider.subscriptions.push({ product_id: "plan_product", status: "active" })
  await expect(f.plan()).rejects.toThrow("already exists")
  expect(posts()).toHaveLength(0)
})

test("failed preflight is retryable because it never started a provider POST", async () => {
  const f = await fixture()
  lists.mockRejectedValueOnce(new Error("Unavailable"))
  await expect(f.plan()).rejects.toThrow("Unavailable")
  await f.plan()
  expect(posts()).toHaveLength(1)
})

test.each([
  { customer_id: "other" },
  { product_id: "other" },
  { metadata: { organizationId, kind: "plan", region: "us" } },
])("unverified existing checkout fails closed: %j", async (change) => {
  const f = await fixture()
  await f.plan()
  Object.assign(checkout(), change)
  await expect(f.plan()).rejects.toThrow("Could not verify")
  expect(posts()).toHaveLength(1)
})

test("reservation rechecks refund holds and fulfilled subscriptions before issuing the POST", async () => {
  const f = await fixture()
  const claim = {
    organizationId,
    kind: "plan" as const,
    attempt: "test-attempt",
    productId: "plan_product",
  }
  await f.t.mutation(internal.billing.polar.session.reservation.reserve, claim)
  await f.t.run(
    async (ctx) =>
      await ctx.db.patch(f.accountId, { refundHold: "test-refund" })
  )
  await expect(
    f.t.mutation(internal.billing.polar.session.reservation.start, {
      organizationId,
      kind: "plan",
      attempt: claim.attempt,
    })
  ).rejects.toThrow("refund")
  await f.t.run(
    async (ctx) =>
      await ctx.db.patch(f.accountId, {
        refundHold: undefined,
        polar: { customerId: "customer", subscriptionId: "paid" },
      })
  )
  expect(
    await f.t.mutation(internal.billing.polar.session.reservation.start, {
      organizationId,
      kind: "plan",
      attempt: claim.attempt,
    })
  ).toBe(false)
  expect(posts()).toHaveLength(0)
})

test("a succeeded legacy checkout with delayed subscription creation stays blocked", async () => {
  const f = await fixture()
  provider.checkouts.push({
    id: "legacy",
    product_id: "plan_product",
    customer_id: "customer",
    status: "succeeded",
    metadata: { organizationId, kind: "plan", region: "eu" },
  })
  await expect(f.plan()).rejects.toThrow("payment is pending")
  expect(posts()).toHaveLength(0)
})
