// @vitest-environment edge-runtime
import { afterEach, expect, test, vi } from "vitest"
import { args, freezeSettled, setup } from "../../../test/billing/accounts"
import { mockPolar, refund } from "../../../test/billing/polar"
import { internal } from "../../_generated/api"
import { checkRunBudget } from "../guard"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const order = {
  id: "order_original",
  customer_id: "customer_org",
  product_id: "product_top_up",
  paid: true,
  currency: "usd",
  net_amount: 3000,
  refunded_amount: 0,
  metadata: { organizationId: args.organizationId, region: "eu" },
}

async function fixture() {
  const { t, id } = await setup()
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("POLAR_PRODUCT_TOP_UP", "product_top_up")
  await t.run(async (ctx) => {
    await ctx.db.patch(id, {
      state: { kind: "active" },
      micros: { allowance: 0, wallet: 30_000_000 },
    })
    const source = await ctx.db
      .query("transactions")
      .withIndex("by_orderId_and_type", (q) =>
        q.eq("orderId", order.id).eq("type", "topup")
      )
      .unique()
    if (source !== null) {
      await ctx.db.patch(source._id, {
        micros: { amount: 30_000_000, balance: 30_000_000 },
      })
    }
  })
  const apply = (refunded: number, overrides: Record<string, unknown> = {}) =>
    t.mutation(internal.billing.polar.events.apply, {
      order: { ...order, refunded_amount: refunded, ...overrides },
    })
  const balance = () => t.run(async (ctx) => (await ctx.db.get(id))?.micros)
  const ledger = () =>
    t.run(
      async (ctx) =>
        await ctx.db
          .query("transactions")
          .withIndex("by_orderId_and_type", (q) => q.eq("orderId", order.id))
          .take(10)
    )
  return { t, id, apply, balance, ledger }
}

test("partial and full refunds debit the pre-tax amount once despite duplicate and reordered snapshots", async () => {
  const { apply, balance, ledger } = await fixture()
  await apply(1000, { refunded_tax_amount: 250 })
  expect(await balance()).toEqual({ allowance: 0, wallet: 20_000_000 })
  await apply(1000)
  await apply(500)
  await apply(0)
  expect(await balance()).toEqual({ allowance: 0, wallet: 20_000_000 })
  await apply(3000)
  await apply(3000)
  expect(await balance()).toEqual({ allowance: 0, wallet: 0 })
  expect(
    (await ledger()).filter((entry) => entry.type === "refund")
  ).toMatchObject([
    { orderId: order.id, micros: { amount: 30_000_000, balance: 0 } },
  ])
})

test("a refund delivered before payment credits and reverses the purchase atomically", async () => {
  const { t, id, apply, balance, ledger } = await fixture()
  const entries = await ledger()
  await t.run(async (ctx) => {
    for (const entry of entries) {
      await ctx.db.delete(entry._id)
    }
    await ctx.db.patch(id, { micros: { allowance: 0, wallet: 0 } })
  })
  await apply(3000)
  await apply(0)
  expect(await balance()).toEqual({ allowance: 0, wallet: 0 })
  expect(await ledger()).toHaveLength(2)
})

test("already spent refunded credit becomes debt and blocks new work", async () => {
  const { t, id, apply, balance } = await fixture()
  await t.run(
    async (ctx) =>
      await ctx.db.patch(id, {
        micros: { allowance: 0, wallet: 1_000_000 },
      })
  )
  await apply(3000)
  expect(await balance()).toEqual({ allowance: 0, wallet: -29_000_000 })
  for (const interactive of [false, true]) {
    expect(
      await t.run(
        async (ctx) =>
          await checkRunBudget(ctx, {
            organizationId: args.organizationId,
            interactive,
          })
      )
    ).toEqual({ ok: false, reason: "out-of-usage" })
  }
})

test.each([-1, 0.5, 3001, Number.MAX_SAFE_INTEGER])(
  "invalid refunded amount %s leaves the balance unchanged",
  async (amount) => {
    const { apply, balance } = await fixture()
    await expect(apply(amount)).rejects.toThrow("invalid refunded amount")
    expect(await balance()).toEqual({ allowance: 0, wallet: 30_000_000 })
  }
)

test.each([
  { metadata: { ...order.metadata, region: "us" } },
  { metadata: { ...order.metadata, organizationId: "other" } },
  { customer_id: "other" },
  { product_id: "other" },
  { currency: "eur" },
  { paid: false },
])(
  "refunds cannot cross account, product or regional boundaries: %j",
  async (change) => {
    const { apply, balance, ledger } = await fixture()
    await apply(3000, change)
    expect(await balance()).toEqual({ allowance: 0, wallet: 30_000_000 })
    expect(await ledger()).toHaveLength(1)
  }
)

test("a support refund stays reserved until identified, then reconciles only additional provider refunds", async () => {
  const { t, id, apply, balance, ledger } = await fixture()
  await t.run(
    async (ctx) => await ctx.db.patch(id, { state: { kind: "paused" } })
  )
  await freezeSettled(t)
  mockPolar({ order })
  await t.action(internal.billing.refunds.actions.prepare, {
    ...args,
    allowanceMicros: 0,
    walletMicros: 20_000_000,
  })
  await apply(3000)
  expect(await balance()).toEqual({ allowance: 0, wallet: 10_000_000 })
  mockPolar({ order: { ...order, refunded_amount: 3000 } })
  await t.action(internal.billing.refunds.actions.reconcile, {
    caseId: args.caseId,
    refundId: refund.id,
  })
  expect(await balance()).toEqual({ allowance: 0, wallet: 5_000_000 })
  await apply(3000)
  await t.action(internal.billing.refunds.actions.release, {
    organizationId: args.organizationId,
    caseId: args.caseId,
  })
  expect(await balance()).toEqual({ allowance: 0, wallet: 5_000_000 })
  expect(
    (await ledger()).find((entry) => entry.type === "refund")?.micros.amount
  ).toBe(5_000_000)
  expect(
    (await t.run(async (ctx) => await ctx.db.get(id)))?.refundHold
  ).toBeUndefined()
})

test("releasing a settled support hold reconciles a provider refund even if its webhook was missed", async () => {
  const { t, id, balance } = await fixture()
  await t.run(
    async (ctx) => await ctx.db.patch(id, { state: { kind: "paused" } })
  )
  await freezeSettled(t)
  mockPolar({ order })
  await t.action(internal.billing.refunds.actions.prepare, {
    ...args,
    allowanceMicros: 0,
    walletMicros: 20_000_000,
  })
  mockPolar({ order: { ...order, refunded_amount: 2500 } })
  await t.action(internal.billing.refunds.actions.reconcile, {
    caseId: args.caseId,
    refundId: refund.id,
  })
  expect(await balance()).toEqual({ allowance: 0, wallet: 10_000_000 })
  mockPolar({ order: { ...order, refunded_amount: 3000 } })
  await t.action(internal.billing.refunds.actions.release, {
    organizationId: args.organizationId,
    caseId: args.caseId,
  })
  expect(await balance()).toEqual({ allowance: 0, wallet: 5_000_000 })
})

test("released support reservations do not hide a later provider refund", async () => {
  const { t, id, apply, balance } = await fixture()
  await t.run(
    async (ctx) => await ctx.db.patch(id, { state: { kind: "paused" } })
  )
  await freezeSettled(t)
  mockPolar({ order: { ...order, refunded_amount: 500 } })
  await t.action(internal.billing.refunds.actions.prepare, {
    ...args,
    allowanceMicros: 0,
    walletMicros: 20_000_000,
  })
  await t.action(internal.billing.refunds.actions.release, {
    organizationId: args.organizationId,
    caseId: args.caseId,
  })
  expect(await balance()).toEqual({ allowance: 0, wallet: 25_000_000 })
  await apply(3000)
  expect(await balance()).toEqual({ allowance: 0, wallet: 0 })
})

test("support cannot reserve credits already refunded by Polar even with an unrelated wallet balance", async () => {
  const { t, id, apply } = await fixture()
  await apply(1000)
  await t.run(
    async (ctx) =>
      await ctx.db.patch(id, {
        state: { kind: "paused" },
        micros: { allowance: 0, wallet: 50_000_000 },
      })
  )
  await freezeSettled(t)
  mockPolar({ order: { ...order, refunded_amount: 1000 } })
  await expect(
    t.action(internal.billing.refunds.actions.prepare, {
      ...args,
      amountMinor: 2000,
      allowanceMicros: 0,
      walletMicros: 25_000_000,
    })
  ).rejects.toThrow("Credits exceed this purchase after prior refunds")
})
