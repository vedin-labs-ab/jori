import { beforeEach, expect, test, vi } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { ensureAccount } from "./account"
import { checkRunBudget } from "./guard"

vi.mock("./account", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./account")>()),
  ensureAccount: vi.fn(),
}))

const ctx = {} as MutationCtx

beforeEach(() => {
  vi.mocked(ensureAccount).mockReset()
})

function accountWith(overrides: Partial<Doc<"billingAccounts">>) {
  vi.mocked(ensureAccount).mockResolvedValue({
    _id: "account-1",
    organizationId: "organization-1",
    state: "active",
    includedMicros: 0,
    walletMicros: 0,
    autoTopUpUsedMicros: 0,
    updatedAt: 0,
    ...overrides,
  } as Doc<"billingAccounts">)
}

test("paused accounts block all new work", async () => {
  accountWith({ state: "paused", includedMicros: 5_000_000 })

  const budget = await checkRunBudget(ctx, {
    organizationId: "organization-1",
    interactive: true,
  })

  expect(budget).toEqual({ ok: false, reason: "paused" })
})

test("an expired trial blocks even with usage left", async () => {
  accountWith({
    state: "trial",
    trialEndsAt: Date.now() - 1000,
    includedMicros: 5_000_000,
  })

  const budget = await checkRunBudget(ctx, {
    organizationId: "organization-1",
    interactive: true,
  })

  expect(budget).toEqual({ ok: false, reason: "trial-ended" })
})

test("scheduled work stops at zero while interactive work has grace", async () => {
  accountWith({ includedMicros: 0, walletMicros: -500_000 })

  expect(
    await checkRunBudget(ctx, {
      organizationId: "organization-1",
      interactive: false,
    })
  ).toEqual({ ok: false, reason: "out-of-usage" })
  expect(
    await checkRunBudget(ctx, {
      organizationId: "organization-1",
      interactive: true,
    })
  ).toEqual({ ok: true })
})

test("the grace floor is a floor, not a suggestion", async () => {
  accountWith({ includedMicros: 0, walletMicros: -2_000_000 })

  expect(
    await checkRunBudget(ctx, {
      organizationId: "organization-1",
      interactive: true,
    })
  ).toEqual({ ok: false, reason: "out-of-usage" })
})
