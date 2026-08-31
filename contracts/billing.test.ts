import { expect, test } from "vitest"
import {
  dollarsToMicros,
  formatUsd,
  joriModel,
  modelRates,
  priceModelTokens,
  resolveModelRate,
} from "./billing"

test("pins one model, priced by the rate table", () => {
  expect(joriModel).toBe("openai/gpt-5.6-sol")
  expect(modelRates[joriModel]).toBeDefined()
})

test("prices usage at exact integer list rates", () => {
  // 1M input at $5/M plus 100k output at $30/M.
  expect(
    priceModelTokens(joriModel, { input: 1_000_000, output: 100_000 })
  ).toBe(dollarsToMicros(5) + dollarsToMicros(3))
})

test("a single token stays exact", () => {
  expect(priceModelTokens(joriModel, { input: 1, output: 0 })).toBe(
    modelRates[joriModel]?.inputMicrosPerToken
  )
})

test("unknown models bill at the highest configured rate", () => {
  const rate = resolveModelRate("someone/new-model")
  const ceiling = Object.values(modelRates).reduce((max, candidate) =>
    candidate.inputMicrosPerToken + candidate.outputMicrosPerToken >
    max.inputMicrosPerToken + max.outputMicrosPerToken
      ? candidate
      : max
  )

  expect(rate).toEqual(ceiling)
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
