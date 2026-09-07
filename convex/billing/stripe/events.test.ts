import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { apply } from "./events"

const handle = (
  apply as unknown as {
    _handler: (
      ctx: MutationCtx,
      args: { event: unknown; subscription?: unknown }
    ) => Promise<null>
  }
)._handler

beforeEach(() => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("STRIPE_PRICE_STARTER_MONTH", "price_starter")
  vi.stubEnv("STRIPE_PRICE_TEAM_MONTH", "price_team")
})
afterEach(() => vi.unstubAllEnvs())

test.each([
  "us",
  undefined,
  "unknown",
])("ignores %s region before touching local billing data", async (region) => {
  const { ctx, query, insert, patch } = context()
  for (const type of [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
  ]) {
    await handle(ctx, { event: event({ metadata: { region } }, type) })
  }
  expect(query).not.toHaveBeenCalled()
  expect(insert).not.toHaveBeenCalled()
  expect(patch).not.toHaveBeenCalled()
})

test.each([
  "unpaid",
  "no_payment_required",
  undefined,
])("does not fund the wallet when payment status is %s", async (payment_status) => {
  const { ctx, query, insert, patch } = context()
  await handle(ctx, { event: event({ payment_status }) })
  expect(query).not.toHaveBeenCalled()
  expect(insert).not.toHaveBeenCalled()
  expect(patch).not.toHaveBeenCalled()
})

test("credits a paid checkout only to its existing regional customer", async () => {
  const { ctx, insert, patch } = context()
  await handle(ctx, { event: event() })
  expect(insert).toHaveBeenCalledWith(
    "transactions",
    expect.objectContaining({ stripeId: "cs_1", auto: false })
  )
  expect(patch).toHaveBeenCalledWith(
    "account-1",
    expect.objectContaining({ micros: { allowance: 0, wallet: 25_000_000 } })
  )
})

test("does not create a billing account from a webhook", async () => {
  const { ctx, insert, patch } = context(null)
  await handle(ctx, { event: event() })
  expect(insert).not.toHaveBeenCalled()
  expect(patch).not.toHaveBeenCalled()
})

test("rejects a checkout for a different Stripe customer", async () => {
  const { ctx, insert, patch } = context()
  await handle(ctx, { event: event({ customer: "cus_foreign" }) })
  expect(insert).not.toHaveBeenCalled()
  expect(patch).not.toHaveBeenCalled()
})

test("delayed top-up settles once across repeated success events", async () => {
  const { ctx, insert } = context()
  await handle(ctx, { event: event({ payment_status: "unpaid" }) })
  expect(insert).not.toHaveBeenCalled()
  await handle(ctx, {
    event: event({}, "checkout.session.async_payment_succeeded"),
  })
  await handle(ctx, {
    event: event({}, "checkout.session.async_payment_succeeded"),
  })
  await handle(ctx, { event: event() })
  expect(insert).toHaveBeenCalledTimes(1)
})

test("failed delayed checkout never grants funds or changes the plan", async () => {
  const { ctx, query, insert, patch } = context()
  await handle(ctx, {
    event: event({}, "checkout.session.async_payment_failed"),
  })
  expect(query).not.toHaveBeenCalled()
  expect(insert).not.toHaveBeenCalled()
  expect(patch).not.toHaveBeenCalled()
})

test("subscription updates cannot activate an unpaid checkout", async () => {
  vi.stubEnv("STRIPE_PRICE_STARTER_MONTH", "price_starter")
  const { ctx, insert, patch } = context()
  await handle(ctx, {
    event: event(
      {
        id: "sub_1",
        status: "active",
        items: { data: [{ price: { id: "price_starter" } }] },
      },
      "customer.subscription.updated"
    ),
  })
  expect(insert).not.toHaveBeenCalled()
  expect(patch).not.toHaveBeenCalled()
})

test("a paid delayed subscription is activated once", async () => {
  const { ctx, insert, patch } = context()
  const subscription = event(
    {
      subscription: "sub_1",
      metadata: {
        organizationId: "organization-1",
        region: "eu",
        kind: "plan",
        plan: "starter",
        interval: "month",
      },
    },
    "checkout.session.async_payment_succeeded"
  )
  await handle(ctx, {
    event: subscription,
    subscription: currentSubscription(),
  })
  await handle(ctx, {
    event: subscription,
    subscription: currentSubscription(),
  })
  expect(insert).toHaveBeenCalledTimes(1)
  expect(patch).toHaveBeenCalledWith(
    "account-1",
    expect.objectContaining({
      state: { kind: "active", plan: "starter", interval: "month" },
      stripe: { customerId: "cus_1", subscriptionId: "sub_1" },
    })
  )
})

test.each([
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
])("late checkout cannot activate a currently %s subscription", async (status) => {
  const { ctx, patch } = context()
  await handle(ctx, {
    event: event({
      subscription: "sub_1",
      metadata: {
        organizationId: "organization-1",
        region: "eu",
        kind: "plan",
      },
    }),
    subscription: { ...currentSubscription(), status },
  })
  expect(patch).not.toHaveBeenCalled()
})

test("paid checkout uses the current price instead of stale checkout metadata", async () => {
  const { ctx, patch } = context()
  await handle(ctx, {
    event: event({
      subscription: "sub_1",
      metadata: {
        organizationId: "organization-1",
        region: "eu",
        kind: "plan",
        plan: "starter",
        interval: "month",
      },
    }),
    subscription: {
      ...currentSubscription(),
      items: { data: [{ price: { id: "price_team" } }] },
    },
  })
  expect(patch).toHaveBeenCalledWith(
    "account-1",
    expect.objectContaining({
      state: { kind: "active", plan: "team", interval: "month" },
    })
  )
})

function currentSubscription() {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    metadata: { organizationId: "organization-1", region: "eu" },
    items: { data: [{ price: { id: "price_starter" } }] },
  }
}

function event(
  overrides: Record<string, unknown> = {},
  type = "checkout.session.completed"
) {
  return {
    type,
    data: {
      object: {
        id: "cs_1",
        customer: "cus_1",
        payment_status: "paid",
        metadata: {
          region: "eu",
          organizationId: "organization-1",
          kind: "top-up",
          micros: "25000000",
        },
        ...overrides,
      },
    },
  }
}

function context(
  account: Partial<Doc<"accounts">> | null = {
    _id: "account-1" as Doc<"accounts">["_id"],
    organizationId: "organization-1",
    stripe: { customerId: "cus_1" },
    state: { kind: "trial", endsAt: 0 },
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
