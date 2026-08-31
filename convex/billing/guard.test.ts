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

function accountWith(overrides: Partial<Doc<"accounts">>) {
  vi.mocked(ensureAccount).mockResolvedValue({
    _id: "account-1",
    organizationId: "organization-1",
    state: { kind: "active", plan: "starter", interval: "month" },
    micros: { allowance: 0, wallet: 0 },
    topUp: { charged: { micros: 0 } },
    updatedAt: 0,
    ...overrides,
  } as Doc<"accounts">)
}

test("paused accounts block all new work", async () => {
  accountWith({
    state: { kind: "paused", plan: "starter", interval: "month" },
    micros: { allowance: 5_000_000, wallet: 0 },
  })

  const budget = await checkRunBudget(ctx, {
    organizationId: "organization-1",
    interactive: true,
  })

  expect(budget).toEqual({ ok: false, reason: "paused" })
})

test("an expired trial blocks even with usage left", async () => {
  accountWith({
    state: { kind: "trial", endsAt: Date.now() - 1000 },
    micros: { allowance: 5_000_000, wallet: 0 },
  })

  const budget = await checkRunBudget(ctx, {
    organizationId: "organization-1",
    interactive: true,
  })

  expect(budget).toEqual({ ok: false, reason: "trial-ended" })
})

test("scheduled work stops at zero while interactive work has grace", async () => {
  accountWith({ micros: { allowance: 0, wallet: -500_000 } })

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
  accountWith({ micros: { allowance: 0, wallet: -2_000_000 } })

  expect(
    await checkRunBudget(ctx, {
      organizationId: "organization-1",
      interactive: true,
    })
  ).toEqual({ ok: false, reason: "out-of-usage" })
})
