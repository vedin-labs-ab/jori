import { expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { requireActivePlan } from "./account"

function account(overrides: Partial<Doc<"accounts">>) {
  return {
    state: { kind: "unsubscribed" },
    micros: { allowance: 0, wallet: 0 },
    topUp: { charged: { micros: 0 } },
    ...overrides,
  } as Doc<"accounts">
}

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
