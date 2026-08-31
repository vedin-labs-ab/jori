import { expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { requireActivePlan, trialRemainderMicros } from "./account"

function account(overrides: Partial<Doc<"accounts">>) {
  return {
    state: { kind: "trial", endsAt: 1000 },
    micros: { allowance: 0, wallet: 0 },
    topUp: { charged: { micros: 0 } },
    ...overrides,
  } as Doc<"accounts">
}

test("a live trial carries its unspent usage into the first cycle", () => {
  const remainder = trialRemainderMicros(
    account({ micros: { allowance: 9_000_000, wallet: 0 } }),
    500
  )

  expect(remainder).toBe(9_000_000)
})

test("an expired trial brings nothing along", () => {
  const remainder = trialRemainderMicros(
    account({ micros: { allowance: 9_000_000, wallet: 0 } }),
    2000
  )

  expect(remainder).toBe(0)
})

test("an overdrawn trial cannot go negative", () => {
  const remainder = trialRemainderMicros(
    account({ micros: { allowance: -50_000, wallet: 0 } }),
    500
  )

  expect(remainder).toBe(0)
})

test("active accounts have no trial remainder", () => {
  const remainder = trialRemainderMicros(
    account({
      state: { kind: "active", plan: "starter", interval: "month" },
      micros: { allowance: 9_000_000, wallet: 0 },
    }),
    500
  )

  expect(remainder).toBe(0)
})

test("wallet funding requires an active plan", () => {
  const active = account({
    state: { kind: "active", plan: "starter", interval: "month" },
  })
  const paused = account({
    state: { kind: "paused", plan: "starter", interval: "month" },
  })

  expect(() => requireActivePlan(active)).not.toThrow()
  expect(() => requireActivePlan(account({}))).toThrow(
    "An active plan is required to fund the wallet."
  )
  expect(() => requireActivePlan(paused)).toThrow(
    "An active plan is required to fund the wallet."
  )
})
