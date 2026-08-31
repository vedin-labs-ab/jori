import { beforeEach, expect, test, vi } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { ensureAccount, holdAutoTopUp } from "./account"
import { debitRun } from "./ledger"
import { meterModelUsage } from "./meter"

vi.mock("./account", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./account")>()),
  ensureAccount: vi.fn(),
  holdAutoTopUp: vi.fn(),
}))
vi.mock("./ledger", () => ({ debitRun: vi.fn() }))

const configuredAccount = {
  _id: "account-1",
  organizationId: "organization-1",
  state: { kind: "trial", endsAt: Date.now() + 1000 },
  micros: { allowance: 0, wallet: 0 },
  topUp: {
    micros: {
      threshold: 10_000_000,
      amount: 25_000_000,
      cap: 100_000_000,
    },
    charged: { micros: 0 },
  },
  stripe: { customerId: "customer-1" },
  updatedAt: 0,
} as Doc<"accounts">

function meterOnce(account: Doc<"accounts">, schedule: () => void) {
  vi.mocked(ensureAccount).mockResolvedValue(account)

  return meterModelUsage(
    {
      db: { get: vi.fn(async () => account) },
      scheduler: { runAfter: schedule },
    } as unknown as MutationCtx,
    {
      run: {
        _id: "run-1",
        organizationId: account.organizationId,
      } as Doc<"runs">,
      usage: { inputTokens: 1_000, outputTokens: 200 },
    }
  )
}

beforeEach(() => {
  vi.mocked(ensureAccount).mockReset()
  vi.mocked(holdAutoTopUp).mockReset()
  vi.mocked(debitRun).mockReset()
})

test("a trial cannot schedule an auto top-up", async () => {
  const schedule = vi.fn()

  await meterOnce(configuredAccount, schedule)

  expect(holdAutoTopUp).not.toHaveBeenCalled()
  expect(schedule).not.toHaveBeenCalled()
})

test("an active plan can schedule its configured auto top-up", async () => {
  const schedule = vi.fn()

  await meterOnce(
    {
      ...configuredAccount,
      state: { kind: "active", plan: "starter", interval: "month" },
    },
    schedule
  )

  expect(holdAutoTopUp).toHaveBeenCalledOnce()
  expect(schedule).toHaveBeenCalledOnce()
})

test("the debit carries the tokens the amount was made of", async () => {
  await meterOnce(configuredAccount, vi.fn())

  expect(debitRun).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      micros: 11_000,
      tokens: { input: 1_000, output: 200 },
    })
  )
})

test("a spent monthly cap holds the charge back", async () => {
  const schedule = vi.fn()

  await meterOnce(
    {
      ...configuredAccount,
      state: { kind: "active", plan: "starter", interval: "month" },
      topUp: {
        ...configuredAccount.topUp,
        charged: { micros: 90_000_000 },
      },
    },
    schedule
  )

  expect(holdAutoTopUp).not.toHaveBeenCalled()
  expect(schedule).not.toHaveBeenCalled()
})
