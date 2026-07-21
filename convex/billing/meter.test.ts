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
  state: "trial",
  includedMicros: 0,
  walletMicros: 0,
  autoTopUp: {
    amountMicros: 25_000_000,
    monthlyCapMicros: 100_000_000,
    thresholdMicros: 10_000_000,
  },
  autoTopUpUsedMicros: 0,
  stripeCustomerId: "customer-1",
  updatedAt: 0,
} as Doc<"billingAccounts">

beforeEach(() => {
  vi.mocked(ensureAccount).mockReset()
  vi.mocked(holdAutoTopUp).mockReset()
  vi.mocked(debitRun).mockReset()
})

test("a trial cannot schedule a legacy auto top-up", async () => {
  const schedule = vi.fn()
  vi.mocked(ensureAccount).mockResolvedValue(configuredAccount)

  await meterModelUsage(
    {
      db: { get: vi.fn(async () => configuredAccount) },
      scheduler: { runAfter: schedule },
    } as unknown as MutationCtx,
    {
      run: {
        _id: "run-1",
        organizationId: configuredAccount.organizationId,
      } as Doc<"runs">,
      usage: { inputTokens: 1, outputTokens: 0 },
    }
  )

  expect(holdAutoTopUp).not.toHaveBeenCalled()
  expect(schedule).not.toHaveBeenCalled()
})

test("an active plan can schedule its configured auto top-up", async () => {
  const account = {
    ...configuredAccount,
    plan: "starter" as const,
    state: "active" as const,
  }
  const schedule = vi.fn()
  vi.mocked(ensureAccount).mockResolvedValue(account)

  await meterModelUsage(
    {
      db: { get: vi.fn(async () => account) },
      scheduler: { runAfter: schedule },
    } as unknown as MutationCtx,
    {
      run: {
        _id: "run-1",
        organizationId: account.organizationId,
      } as Doc<"runs">,
      usage: { inputTokens: 1, outputTokens: 0 },
    }
  )

  expect(holdAutoTopUp).toHaveBeenCalledOnce()
  expect(schedule).toHaveBeenCalledOnce()
})
