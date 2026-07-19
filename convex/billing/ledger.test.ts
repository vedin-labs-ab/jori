import { expect, test, vi } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { creditTopUp, debitRun } from "./ledger"

const account = (overrides: Partial<Doc<"billingAccounts">> = {}) =>
  ({
    _id: "account-1",
    tenantId: "tenant-1",
    state: "active",
    includedMicros: 1_000_000,
    walletMicros: 500_000,
    autoTopUpUsedMicros: 0,
    updatedAt: 0,
    ...overrides,
  }) as Doc<"billingAccounts">

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

test("debits drain included usage before the wallet", async () => {
  const { ctx, patch } = fakeCtx()

  await debitRun(ctx, {
    account: account(),
    runId: "run-1" as Id<"runs">,
    micros: 1_200_000,
    now: 42,
  })

  expect(patch).toHaveBeenCalledWith("account-1", {
    includedMicros: 0,
    walletMicros: 300_000,
    updatedAt: 42,
  })
})

test("the wallet may go negative for in-flight work", async () => {
  const { ctx, patch } = fakeCtx()

  await debitRun(ctx, {
    account: account({ includedMicros: 0, walletMicros: 100_000 }),
    runId: "run-1" as Id<"runs">,
    micros: 250_000,
    now: 42,
  })

  expect(patch).toHaveBeenCalledWith("account-1", {
    includedMicros: 0,
    walletMicros: -150_000,
    updatedAt: 42,
  })
})

test("a run accumulates into a single debit entry with attribution", async () => {
  const { ctx, insert, patch } = fakeCtx({
    _id: "entry-1",
    type: "debit",
    amountMicros: 40_000,
    includedMicros: 40_000,
  })

  await debitRun(ctx, {
    account: account(),
    runId: "run-1" as Id<"runs">,
    micros: 60_000,
    now: 42,
  })

  expect(insert).not.toHaveBeenCalled()
  expect(patch).toHaveBeenCalledWith("entry-1", {
    amountMicros: 100_000,
    includedMicros: 100_000,
    balanceMicros: 1_440_000,
    timestamp: 42,
  })
})

test("debit entries record their pot split and the balance left", async () => {
  const { ctx, insert } = fakeCtx()

  await debitRun(ctx, {
    account: account({ includedMicros: 50_000, walletMicros: 200_000 }),
    runId: "run-1" as Id<"runs">,
    micros: 80_000,
    now: 42,
  })

  expect(insert).toHaveBeenCalledWith(
    "billingEntries",
    expect.objectContaining({
      amountMicros: 80_000,
      includedMicros: 50_000,
      balanceMicros: 170_000,
    })
  )
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
