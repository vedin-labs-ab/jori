import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { apply } from "./events"

const handle = (
  apply as unknown as {
    _handler: (
      ctx: MutationCtx,
      args: { order?: unknown; subscription?: unknown }
    ) => Promise<null>
  }
)._handler

beforeEach(() => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("POLAR_PRODUCT_CLOUD", "product_cloud")
  vi.stubEnv("POLAR_PRODUCT_TOP_UP", "product_top_up")
})
afterEach(() => vi.unstubAllEnvs())

test.each(["us", undefined, "unknown"])(
  "ignores %s region before touching local billing data",
  async (region) => {
    const { ctx, query, insert, patch } = context()
    await handle(ctx, { order: topUp({ metadata: { region } }) })
    await handle(ctx, { order: planOrder({ metadata: { region } }) })
    await handle(ctx, { subscription: subscription({ metadata: { region } }) })
    expect(query).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
    expect(patch).not.toHaveBeenCalled()
  }
)

test.each([
  ["is unpaid", { paid: false }],
  ["is for another product", { product_id: "product_other" }],
  ["is not in dollars", { currency: "eur" }],
  ["charged nothing", { net_amount: 0 }],
  [
    "was paid by a customer kept under another id",
    {
      customer: { external_id: "organization-2" },
    },
  ],
])("does not fund the wallet when the order %s", async (_name, change) => {
  const { ctx, insert, patch } = context()
  await handle(ctx, { order: topUp(change) })
  expect(insert).not.toHaveBeenCalled()
  expect(patch).not.toHaveBeenCalled()
})

test("credits what a paid top-up charged before tax, once across repeated deliveries", async () => {
  const { ctx, insert, patch } = context()
  await handle(ctx, { order: topUp() })
  await handle(ctx, { order: topUp() })
  expect(insert).toHaveBeenCalledTimes(1)
  expect(insert).toHaveBeenCalledWith(
    "transactions",
    expect.objectContaining({ orderId: "order_1", auto: false })
  )
  expect(patch).toHaveBeenCalledWith(
    "account-1",
    expect.objectContaining({ micros: { allowance: 0, wallet: 25_000_000 } })
  )
})

test("an auto top-up counts against the monthly cap and spends its claim", async () => {
  const { ctx, patch } = context()
  await handle(ctx, {
    order: topUp({
      metadata: {
        region: "eu",
        organizationId: "organization-1",
        kind: "auto-top-up",
      },
    }),
  })
  expect(patch).toHaveBeenCalledWith(
    "account-1",
    expect.objectContaining({ topUp: { charged: { micros: 25_000_000 } } })
  )
})

test("does not create a billing account from a webhook", async () => {
  const { ctx, insert, patch } = context(null)
  await handle(ctx, { order: topUp() })
  await handle(ctx, { order: planOrder() })
  expect(insert).not.toHaveBeenCalled()
  expect(patch).not.toHaveBeenCalled()
})

test("subscription updates cannot activate a plan no paid order started", async () => {
  const { ctx, insert, patch } = context()
  await handle(ctx, { subscription: subscription() })
  expect(insert).not.toHaveBeenCalled()
  expect(patch).not.toHaveBeenCalled()
})

test("the first paid order of a plan subscription activates it once", async () => {
  const { ctx, insert, patch } = context()
  await handle(ctx, { order: planOrder() })
  await handle(ctx, { order: planOrder() })
  expect(insert).toHaveBeenCalledTimes(1)
  expect(patch).toHaveBeenCalledWith(
    "account-1",
    expect.objectContaining({
      state: { kind: "active" },
      polar: { customerId: "customer_1", subscriptionId: "sub_1" },
    })
  )
})

test("a renewal order never restarts the plan", async () => {
  const { ctx, insert, patch } = context()
  await handle(ctx, {
    order: planOrder({ billing_reason: "subscription_cycle" }),
  })
  expect(insert).not.toHaveBeenCalled()
  expect(patch).not.toHaveBeenCalled()
})

test.each(["canceled", "incomplete", "incomplete_expired", "unpaid", "paused"])(
  "a late order cannot activate a currently %s subscription",
  async (status) => {
    const { ctx, patch } = context()
    await handle(ctx, {
      order: planOrder({ subscription: subscription({ status }) }),
    })
    expect(patch).not.toHaveBeenCalled()
  }
)

test("a paid subscription for a product that is not the plan activates nothing", async () => {
  const { ctx, insert, patch } = context()
  await handle(ctx, {
    order: planOrder({
      product_id: "product_other",
      subscription: subscription({ product_id: "product_other" }),
    }),
  })
  expect(insert).not.toHaveBeenCalled()
  expect(patch).not.toHaveBeenCalled()
})

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    customer_id: "customer_1",
    product_id: "product_cloud",
    status: "active",
    metadata: { organizationId: "organization-1", region: "eu" },
    ...overrides,
  }
}

function order(overrides: Record<string, unknown>) {
  return {
    id: "order_1",
    paid: true,
    currency: "usd",
    customer_id: "customer_1",
    customer: { external_id: "organization-1" },
    metadata: { region: "eu", organizationId: "organization-1" },
    ...overrides,
  }
}

function topUp(overrides: Record<string, unknown> = {}) {
  return order({
    product_id: "product_top_up",
    billing_reason: "purchase",
    net_amount: 2500,
    total_amount: 3125,
    ...overrides,
  })
}

function planOrder(overrides: Record<string, unknown> = {}) {
  return order({
    product_id: "product_cloud",
    billing_reason: "subscription_create",
    subscription_id: "sub_1",
    subscription: subscription(),
    ...overrides,
  })
}

function context(
  account: Partial<Doc<"accounts">> | null = {
    _id: "account-1" as Doc<"accounts">["_id"],
    organizationId: "organization-1",
    state: { kind: "unsubscribed" },
    micros: { allowance: 0, wallet: 0 },
    topUp: { charged: { micros: 0 } },
  }
) {
  let transaction: Record<string, unknown> | null = null
  const insert = vi.fn(
    async (_table: string, values: Record<string, unknown>) => {
      transaction = values
      return "transaction-1"
    }
  )
  const patch = vi.fn(async (_id: string, values: Record<string, unknown>) => {
    Object.assign(account ?? {}, values)
  })
  const query = vi.fn((table: string) => ({
    withIndex: () => ({
      unique: async () => (table === "accounts" ? account : transaction),
    }),
  }))
  const ctx = { db: { insert, patch, query } } as unknown as MutationCtx
  return { ctx, insert, patch, query }
}
