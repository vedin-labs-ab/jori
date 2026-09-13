// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { afterEach, expect, test, vi } from "vitest"
import { args, freezeSettled, setup } from "../../../test/billing/accounts"
import { mockStripe, refund } from "../../../test/billing/stripe"
import { internal } from "../../_generated/api"
import { checkRunBudget } from "../guard"
import { prepare, reconcile, release } from "./actions"
import { freeze } from "./data"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

test("operator functions are internal and cannot create real Stripe refunds", () => {
  expect(
    [freeze, prepare, reconcile, release].every((fn) => fn.isInternal)
  ).toBe(true)
})

test("reserves balances once, verifies Stripe and reconciles once without changing unrelated wallet credits", async () => {
  const { t, id } = await setup()
  await freezeSettled(t)
  const first = await t.action(internal.billing.refunds.actions.prepare, args)
  expect(
    await t.action(internal.billing.refunds.actions.prepare, args)
  ).toEqual(first)
  expect((await t.run(async (ctx) => await ctx.db.get(id)))?.micros).toEqual({
    allowance: 0,
    wallet: 40_000_000,
  })
  mockStripe({ refunded: 2500 })
  const settled = await t.action(internal.billing.refunds.actions.reconcile, {
    caseId: args.caseId,
    refundId: refund.id,
  })
  expect(
    await t.action(internal.billing.refunds.actions.reconcile, {
      caseId: args.caseId,
      refundId: refund.id,
    })
  ).toEqual(settled)
  await t.action(internal.billing.refunds.actions.release, {
    organizationId: args.organizationId,
    caseId: args.caseId,
  })
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toMatchObject({
    micros: { allowance: 0, wallet: 40_000_000 },
  })
  expect(
    (await t.run(async (ctx) => await ctx.db.get(id)))?.refundHold
  ).toBeUndefined()
  expect(
    await t.query(internal.billing.refunds.data.read, { caseId: args.caseId })
  ).toMatchObject({ status: "refunded", refundId: refund.id })
})

test("freeze blocks new interactive work even while a subscription is active and disables auto top-ups", async () => {
  const { t, id } = await setup()
  await t.run(
    async (ctx) =>
      await ctx.db.patch(id, {
        state: { kind: "active" },
        topUp: {
          micros: { threshold: 1, amount: 2, cap: 3 },
          charged: { micros: 0 },
        },
      })
  )
  await freezeSettled(t)
  expect(
    await t.run(
      async (ctx) =>
        await checkRunBudget(ctx, {
          organizationId: args.organizationId,
          interactive: true,
        })
    )
  ).toEqual({ ok: false, reason: "paused" })
  expect(
    (await t.run(async (ctx) => await ctx.db.get(id)))?.topUp.micros
  ).toBeUndefined()
  await expect(
    t.action(internal.billing.refunds.actions.prepare, args)
  ).rejects.toThrow("Cancel the subscription")
})

test.each([
  { refund: { ...refund, status: "pending" } },
  { refund: { ...refund, status: "failed" } },
  { refund: { ...refund, amount: 3000 } },
  { refund: { ...refund, charge: "ch_another" } },
  { refund: { ...refund, currency: "eur" } },
  { customer: "cus_another" },
])(
  "refuses unverified refund and leaves reserved credits held: %j",
  async (options) => {
    const { t, id } = await setup()
    await freezeSettled(t)
    await t.action(internal.billing.refunds.actions.prepare, args)
    mockStripe({ refunded: 2500, ...options })
    await expect(
      t.action(internal.billing.refunds.actions.reconcile, {
        caseId: args.caseId,
        refundId: refund.id,
      })
    ).rejects.toThrow()
    expect(
      (await t.run(async (ctx) => await ctx.db.get(id)))?.micros.allowance
    ).toBe(0)
    expect(
      (
        await t.query(internal.billing.refunds.data.read, {
          caseId: args.caseId,
        })
      )?.status
    ).toBe("reserved")
  }
)

test("restores canceled reservation only when Stripe proves no new refund or pending attempt", async () => {
  const { t, id } = await setup()
  await freezeSettled(t)
  await t.action(internal.billing.refunds.actions.prepare, args)
  mockStripe({ refunds: [{ ...refund, status: "pending" }] })
  await expect(
    t.action(internal.billing.refunds.actions.release, {
      organizationId: args.organizationId,
      caseId: args.caseId,
    })
  ).rejects.toThrow("pending")
  mockStripe({ refunded: 2500 })
  await expect(
    t.action(internal.billing.refunds.actions.release, {
      organizationId: args.organizationId,
      caseId: args.caseId,
    })
  ).rejects.toThrow("pending")
  mockStripe({ refunds: [{ ...refund, status: "failed" }] })
  await t.action(internal.billing.refunds.actions.release, {
    organizationId: args.organizationId,
    caseId: args.caseId,
  })
  expect(
    (await t.run(async (ctx) => await ctx.db.get(id)))?.micros.allowance
  ).toBe(10_000_000)
  await expect(
    t.action(internal.billing.refunds.actions.release, {
      organizationId: args.organizationId,
      caseId: args.caseId,
    })
  ).rejects.toThrow("Freeze")
})

test("rejects over-refunds, conflicting cases and insufficient credits without modifying balances", async () => {
  const { t, id } = await setup()
  await freezeSettled(t)
  await expect(
    t.action(internal.billing.refunds.actions.prepare, {
      ...args,
      amountMinor: 3001,
    })
  ).rejects.toThrow("exceeds")
  await expect(
    t.action(internal.billing.refunds.actions.prepare, {
      ...args,
      walletMicros: 40_000_001,
    })
  ).rejects.toThrow("exceed")
  await expect(
    t.mutation(internal.billing.refunds.data.freeze, {
      organizationId: args.organizationId,
      caseId: "other",
    })
  ).rejects.toThrow("Another")
  await t.action(internal.billing.refunds.actions.prepare, args)
  await expect(
    t.action(internal.billing.refunds.actions.prepare, {
      ...args,
      amountMinor: 2400,
    })
  ).rejects.toThrow("different")
  expect((await t.run(async (ctx) => await ctx.db.get(id)))?.micros).toEqual({
    allowance: 0,
    wallet: 40_000_000,
  })
})

test("checks current Stripe subscription state before reserving", async () => {
  const { t } = await setup()
  await freezeSettled(t)
  mockStripe({ subscriptions: [{ status: "active" }] })
  await expect(
    t.action(internal.billing.refunds.actions.prepare, args)
  ).rejects.toThrow("Cancel all")
  expect(
    await t.query(internal.billing.refunds.data.read, { caseId: args.caseId })
  ).toBeNull()
})

test("wallet refund removes only the reviewed unused purchased credits", async () => {
  const { t, id } = await setup()
  await freezeSettled(t)
  await t.action(internal.billing.refunds.actions.prepare, {
    ...args,
    allowanceMicros: 0,
    walletMicros: 20_000_000,
  })
  expect((await t.run(async (ctx) => await ctx.db.get(id)))?.micros).toEqual({
    allowance: 10_000_000,
    wallet: 20_000_000,
  })
})

test("an older Stripe refund cannot settle a new reservation", async () => {
  const { t } = await setup()
  await freezeSettled(t)
  await t.action(internal.billing.refunds.actions.prepare, args)
  mockStripe({ refunded: 2500, refund: { ...refund, created: 1 } })
  await expect(
    t.action(internal.billing.refunds.actions.reconcile, {
      caseId: args.caseId,
      refundId: refund.id,
    })
  ).rejects.toThrow("predates")
})
