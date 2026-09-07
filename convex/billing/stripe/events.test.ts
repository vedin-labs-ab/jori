import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { stripeMetadata } from "./config"
import { apply } from "./events"

const handle = (
  apply as unknown as {
    _handler: (ctx: MutationCtx, args: { event: unknown }) => Promise<null>
  }
)._handler

beforeEach(() => vi.stubEnv("JORI_REGION", "eu"))
afterEach(() => vi.unstubAllEnvs())

test("metadata cannot override the deployment region", () => {
  expect(
    stripeMetadata({ region: "us", organizationId: "organization-1" })
  ).toEqual({ region: "eu", organizationId: "organization-1" })
})

test.each([
  "us",
  undefined,
  "unknown",
])("ignores %s region before touching local billing data", async (region) => {
  const { ctx, query, insert, patch } = context()
  for (const type of [
    "checkout.session.completed",
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
    micros: { allowance: 0, wallet: 0 },
    topUp: { charged: { micros: 0 } },
  }
) {
  const insert = vi.fn(async () => "transaction-1")
  const patch = vi.fn(async () => undefined)
  const query = vi.fn((table: string) => ({
    withIndex: () => ({
      unique: async () => (table === "accounts" ? account : null),
    }),
  }))
  const ctx = { db: { insert, patch, query } } as unknown as MutationCtx
  return { ctx, insert, patch, query }
}
