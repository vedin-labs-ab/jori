import { expect, test } from "vitest"
import {
  budgetSentence,
  dollarsToMicros,
  formatUsd,
  priceModelTokens,
  priceTokens,
} from "./billing"
import { modelRate } from "./models/catalog"
import { defaultSelection } from "./models/selection"

test("prices usage at the catalog's list rates for the model", () => {
  // 1M input at $2/M plus 100k output at $10/M.
  expect(
    priceModelTokens(defaultSelection.model, {
      input: 1_000_000,
      output: 100_000,
    })
  ).toBe(dollarsToMicros(2) + dollarsToMicros(1))
})

test("a single token stays exact", () => {
  expect(
    priceModelTokens(defaultSelection.model, { input: 1, output: 0 })
  ).toBe(modelRate(defaultSelection.model).inputMicrosPerToken)
})

test("fractional rates round to whole micro-dollars", () => {
  expect(
    priceTokens(
      { inputMicrosPerToken: 0.2, outputMicrosPerToken: 1.2 },
      { input: 3, output: 1 }
    )
  ).toBe(2)
})

test("a model outside the catalog cannot be priced", () => {
  expect(() =>
    priceModelTokens("someone/new-model", { input: 1, output: 1 })
  ).toThrow("someone/new-model is not a model Jori can run on.")
})

test("formats micro-dollars as currency", () => {
  expect(formatUsd(0)).toBe("$0.00")
  expect(formatUsd(dollarsToMicros(34))).toBe("$34.00")
  expect(formatUsd(1_240_000)).toBe("$1.24")
  expect(formatUsd(-1_200_000)).toBe("-$1.20")
  expect(formatUsd(1_188_000_000)).toBe("$1,188.00")
})

test("marks sub-cent amounts instead of rounding them away", () => {
  expect(formatUsd(4_000)).toBe("<$0.01")
  expect(formatUsd(-4_000)).toBe("-<$0.01")
})

test("a budget sentence names the state, the consequence, and the remedy", () => {
  expect(budgetSentence("out-of-usage", "this message waits")).toBe(
    "Jori is out of usage, so this message waits. Add to the wallet in Billing settings, or wait for the monthly reset."
  )
  expect(budgetSentence("paused", "new work cannot start")).toBe(
    "The subscription is paused, so new work cannot start. Visit Billing settings to reactivate it."
  )
  expect(
    budgetSentence("unsubscribed", "the run stopped before its next turn")
  ).toBe(
    "The organization isn't on a plan yet, so the run stopped before its next turn. Choose a plan in Billing settings to get Jori working."
  )
})
