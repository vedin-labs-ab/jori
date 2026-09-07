import { defaultSelection } from "@contracts/models/selection"
import { expect, test } from "vitest"
import { type ChatContextUsage } from "../types"
import {
  contextFraction,
  contextPercent,
  contextTone,
  formatTokens,
  turnCost,
} from "./usage"

test("the share of the window is clamped and rounded", () => {
  expect(contextPercent(usage({ usedTokens: 61_000 }))).toBe(31)
  expect(contextFraction(usage({ usedTokens: 250_000 }))).toBe(1)
  expect(contextFraction(usage({ usedTokens: 0 }))).toBe(0)
  expect(contextFraction(usage({ windowTokens: 0 }))).toBe(0)
})

test("the tone turns warm at 70% and critical at 85%", () => {
  expect(contextTone(0.69)).toBe("calm")
  expect(contextTone(0.7)).toBe("warm")
  expect(contextTone(0.849)).toBe("warm")
  expect(contextTone(0.85)).toBe("critical")
})

test("tokens read compactly", () => {
  expect(formatTokens(61_000)).toBe("61K")
  expect(formatTokens(900)).toBe("900")
  expect(formatTokens(1_250_000)).toBe("1.3M")
})

test("the last turn is priced at list rates, or not at all before a turn lands", () => {
  // 61k input at $2/M plus 900 output at $10/M.
  expect(turnCost(usage({}))).toBe("$0.13")
  expect(turnCost(usage({ turn: null }))).toBeNull()
  expect(
    turnCost(usage({ turn: { cached: 0, input: 0, output: 0, reasoning: 0 } }))
  ).toBeNull()
})

function usage(overrides: Partial<ChatContextUsage>): ChatContextUsage {
  return {
    condensed: false,
    model: defaultSelection.model,
    runId: "runs_1",
    turn: { cached: 40_000, input: 61_000, output: 900, reasoning: 300 },
    usedTokens: 61_000,
    windowTokens: 200_000,
    ...overrides,
  }
}
