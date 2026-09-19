import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { liveModelRate } from "../model/rate"
import { recordUsageDebit } from "../usage/record"
import { ensureAccount, holdAutoTopUp } from "./account"
import { debitRun } from "./ledger"
import { meterModelUsage } from "./meter"

vi.mock("./account", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./account")>()),
  ensureAccount: vi.fn(),
  holdAutoTopUp: vi.fn(),
}))
vi.mock("./ledger", () => ({ debitRun: vi.fn() }))
vi.mock("../usage/record", () => ({ recordUsageDebit: vi.fn() }))
vi.mock("../model/rate", () => ({ liveModelRate: vi.fn() }))

const model = "openai/gpt-5.6-sol"
const tokens = { input: 1_000, output: 200 }

const configuredAccount = {
  _id: "account-1",
  organizationId: "organization-1",
  state: { kind: "unsubscribed" },
  micros: { allowance: 0, wallet: 0 },
  topUp: {
    micros: {
      threshold: 10_000_000,
      amount: 25_000_000,
      cap: 100_000_000,
    },
    charged: { micros: 0 },
  },
  polar: { customerId: "customer-1" },
  updatedAt: 0,
} as Doc<"accounts">

function meterOnce(account: Doc<"accounts">, schedule: () => void) {
  vi.mocked(ensureAccount).mockResolvedValue(account)
  vi.mocked(liveModelRate).mockResolvedValue({
    inputMicrosPerToken: 2,
    outputMicrosPerToken: 10,
  })

  return meterModelUsage(
    {
      db: { get: vi.fn(async () => account) },
      scheduler: { runAfter: schedule },
    } as unknown as MutationCtx,
    {
      model,
      run: {
        _id: "run-1",
        organizationId: account.organizationId,
      } as Doc<"runs">,
      tokens,
    }
  )
}

beforeEach(() => {
  vi.stubEnv("POLAR_OFF_SESSION_ENABLED", "true")
  vi.mocked(ensureAccount).mockReset()
  vi.mocked(holdAutoTopUp).mockReset()
  vi.mocked(debitRun).mockReset()
  vi.mocked(recordUsageDebit).mockReset()
  vi.mocked(liveModelRate).mockReset()
})

test("the live model rate prices the same tokens and amount for the ledger and rollup", async () => {
  vi.mocked(ensureAccount).mockResolvedValue(configuredAccount)
  vi.mocked(liveModelRate).mockResolvedValue({
    inputMicrosPerToken: 0.2,
    outputMicrosPerToken: 1.2,
  })

  await meterModelUsage(
    {
      db: { get: vi.fn(async () => configuredAccount) },
      scheduler: { runAfter: vi.fn() },
    } as unknown as MutationCtx,
    {
      model: "openai/gpt-5.6-luna",
      run: { _id: "run-1", organizationId: "organization-1" } as Doc<"runs">,
      tokens,
    }
  )

  expect(liveModelRate).toHaveBeenCalledWith(
    expect.anything(),
    "openai/gpt-5.6-luna"
  )
  expect(debitRun).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ micros: 440, tokens })
  )
  expect(recordUsageDebit).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      model: "openai/gpt-5.6-luna",
      micros: 440,
      tokens,
    })
  )
})

test("an organization without a plan cannot schedule an auto top-up", async () => {
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
      state: { kind: "active" },
    },
    schedule
  )

  expect(holdAutoTopUp).toHaveBeenCalledOnce()
  expect(schedule).toHaveBeenCalledOnce()
})

test("a spent monthly cap holds the charge back", async () => {
  const schedule = vi.fn()

  await meterOnce(
    {
      ...configuredAccount,
      state: { kind: "active" },
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

afterEach(() => vi.unstubAllEnvs())

test("a previously enabled policy cannot schedule a charge while capability is off", async () => {
  vi.stubEnv("POLAR_OFF_SESSION_ENABLED", "")
  const schedule = vi.fn()
  await meterOnce({ ...configuredAccount, state: { kind: "active" } }, schedule)
  expect(debitRun).toHaveBeenCalledOnce()
  expect(holdAutoTopUp).not.toHaveBeenCalled()
  expect(schedule).not.toHaveBeenCalled()
})
