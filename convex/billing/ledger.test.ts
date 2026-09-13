import { expect, test, vi } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { creditTopUp, debitRun, resetAllowance } from "./ledger"

const account = (overrides: Partial<Doc<"accounts">> = {}) =>
  ({
    _id: "account-1",
    organizationId: "organization-1",
    state: { kind: "active" },
    micros: { allowance: 1_000_000, wallet: 500_000 },
    topUp: { charged: { micros: 0 } },
    updatedAt: 0,
    ...overrides,
  }) as Doc<"accounts">

function fakeCtx(existingEntry: unknown = null) {
  const patch = vi.fn(async () => undefined)
  const insert = vi.fn(async () => "entry-1")
  const ctx = {
    db: {
      patch,
      insert,
      query: () => ({
        withIndex: () => ({ unique: async () => existingEntry }),
      }),
    },
  } as unknown as MutationCtx

  return { ctx, insert, patch }
}

const policy = { threshold: 10_000_000, amount: 25_000_000, cap: 100_000_000 }

const debit = {
  runId: "run-1" as Id<"runs">,
  tokens: { input: 100, output: 20 },
  now: 42,
}

test("debits drain allowance first and record the pot split, tokens, and balance", async () => {
  const { ctx, insert, patch } = fakeCtx()

  await debitRun(ctx, { ...debit, account: account(), micros: 1_200_000 })

  expect(patch).toHaveBeenCalledWith("account-1", {
    micros: { allowance: 0, wallet: 300_000 },
    updatedAt: 42,
  })
  expect(insert).toHaveBeenCalledWith(
    "transactions",
    expect.objectContaining({
      micros: { amount: 1_200_000, allowance: 1_000_000, balance: 300_000 },
      tokens: { input: 100, output: 20 },
    })
  )
})

test("the wallet may go negative for in-flight work", async () => {
  const { ctx, patch } = fakeCtx()

  await debitRun(ctx, {
    ...debit,
    account: account({ micros: { allowance: 0, wallet: 100_000 } }),
    micros: 250_000,
  })

  expect(patch).toHaveBeenCalledWith("account-1", {
    micros: { allowance: 0, wallet: -150_000 },
    updatedAt: 42,
  })
})

test("a run accumulates money and tokens into a single debit entry", async () => {
  const { ctx, insert, patch } = fakeCtx({
    _id: "entry-1",
    type: "debit",
    micros: { amount: 40_000, allowance: 40_000, balance: 1_460_000 },
    tokens: { input: 400, output: 80 },
  })

  await debitRun(ctx, { ...debit, account: account(), micros: 60_000 })

  expect(insert).not.toHaveBeenCalled()
  expect(patch).toHaveBeenCalledWith("entry-1", {
    micros: { amount: 100_000, allowance: 100_000, balance: 1_440_000 },
    tokens: { input: 500, output: 100 },
    timestamp: 42,
  })
})

test("top-ups are idempotent on the Stripe id", async () => {
  const { ctx, insert, patch } = fakeCtx({ _id: "entry-1" })

  const credited = await creditTopUp(ctx, {
    account: account(),
    micros: 25_000_000,
    stripeId: "cs_123",
    auto: false,
    now: 42,
  })

  expect(credited).toBe(false)
  expect(insert).not.toHaveBeenCalled()
  expect(patch).not.toHaveBeenCalled()
})

test("top-ups land in the wallet and state the balance they leave", async () => {
  const { ctx, insert, patch } = fakeCtx()

  const credited = await creditTopUp(ctx, {
    account: account(),
    micros: 25_000_000,
    stripeId: "cs_123",
    auto: true,
    now: 42,
  })

  expect(credited).toBe(true)
  expect(patch).toHaveBeenCalledWith("account-1", {
    micros: { allowance: 1_000_000, wallet: 25_500_000 },
    updatedAt: 42,
  })
  expect(insert).toHaveBeenCalledWith(
    "transactions",
    expect.objectContaining({
      micros: { amount: 25_000_000, balance: 26_500_000 },
      stripeId: "cs_123",
      auto: true,
    })
  )
})

test("a fresh allowance replaces the pot and gives the cap back", async () => {
  const { ctx, insert, patch } = fakeCtx()

  await resetAllowance(ctx, {
    account: account({
      micros: { allowance: 200_000, wallet: 500_000 },
      topUp: { micros: policy, charged: { micros: 50_000_000 } },
    }),
    micros: 15_000_000,
    source: "cycle",
    now: 42,
  })

  expect(patch).toHaveBeenCalledWith("account-1", {
    micros: { allowance: 15_000_000, wallet: 500_000 },
    topUp: { micros: policy, charged: { micros: 0 } },
    updatedAt: 42,
  })
  expect(insert).toHaveBeenCalledWith(
    "transactions",
    expect.objectContaining({
      type: "allowance",
      micros: { amount: 15_000_000, balance: 15_500_000 },
      source: "cycle",
    })
  )
})
