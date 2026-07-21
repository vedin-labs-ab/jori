import { expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import {
  hasActivePlan,
  requireActivePlan,
  trialRemainderMicros,
} from "./account"

function account(overrides: Partial<Doc<"billingAccounts">>) {
  return {
    state: "trial",
    includedMicros: 0,
    walletMicros: 0,
    ...overrides,
  } as Doc<"billingAccounts">
}

test("a live trial carries its unspent usage into the first cycle", () => {
  const remainder = trialRemainderMicros(
    account({ includedMicros: 9_000_000, trialEndsAt: 1000 }),
    500
  )

  expect(remainder).toBe(9_000_000)
})

test("an expired trial brings nothing along", () => {
  const remainder = trialRemainderMicros(
    account({ includedMicros: 9_000_000, trialEndsAt: 1000 }),
    2000
  )

  expect(remainder).toBe(0)
})

test("an overdrawn trial cannot go negative", () => {
  const remainder = trialRemainderMicros(
    account({ includedMicros: -50_000, trialEndsAt: 1000 }),
    500
  )

  expect(remainder).toBe(0)
})

test("active accounts have no trial remainder", () => {
  const remainder = trialRemainderMicros(
    account({ state: "active", includedMicros: 9_000_000 }),
    500
  )

  expect(remainder).toBe(0)
})

test("wallet funding requires an active plan", () => {
  const active = account({ state: "active", plan: "starter" })

  expect(hasActivePlan(active)).toBe(true)
  expect(() => requireActivePlan(active)).not.toThrow()
  expect(hasActivePlan(account({ state: "trial" }))).toBe(false)
  expect(() => requireActivePlan(account({ state: "trial" }))).toThrow(
    "An active plan is required to fund the wallet."
  )
  expect(hasActivePlan(account({ state: "paused", plan: "starter" }))).toBe(
    false
  )
})
