import { expect, test } from "vitest"
import {
  compactionPlan,
  compactionSequence,
  contextBudget,
  contextRatio,
} from "./plan"

// 200k less the 32k the answer keeps: 168k of prompt budget.
const window = { contextLength: 200_000, maxCompletionTokens: null }
const clearAt = 126_000
const summarizeAt = 142_800

test("the budget keeps the larger of the provider's cap and 32k free for the answer", () => {
  expect(contextBudget(window)).toBe(168_000)
  expect(
    contextBudget({ contextLength: 200_000, maxCompletionTokens: 100_000 })
  ).toBe(100_000)
  expect(
    contextBudget({ contextLength: 200_000, maxCompletionTokens: 8_000 })
  ).toBe(168_000)
  expect(contextBudget({ contextLength: 10, maxCompletionTokens: null })).toBe(
    1
  )
  expect(contextRatio(84_000, window)).toBe(0.5)
})

test("below three quarters of the budget nothing happens", () => {
  expect(plan({ promptTokens: clearAt - 1 })).toBe("none")
  expect(plan({ promptTokens: undefined })).toBe("none")
})

test("from three quarters the run clears, whatever it did before", () => {
  expect(plan({ promptTokens: clearAt })).toBe("clear")
  expect(
    plan({ compaction: { clearedAtTurn: 4 }, promptTokens: clearAt })
  ).toBe("clear")
})

test("from 85% the run summarizes only once a cleared prompt still reads that full", () => {
  // Nothing cleared yet: the tokens were measured on a whole transcript.
  expect(plan({ promptTokens: summarizeAt })).toBe("clear")
  // Cleared before this turn's measurement, so the clearing was not enough.
  expect(
    plan({ compaction: { clearedAtTurn: 4 }, promptTokens: summarizeAt })
  ).toBe("summarize")
  // Cleared on this very turn: the measurement predates it.
  expect(
    plan({ compaction: { clearedAtTurn: 5 }, promptTokens: summarizeAt })
  ).toBe("clear")
})

test("a run summarizes once and keeps clearing after", () => {
  expect(
    plan({
      compaction: {
        clearedAtTurn: 4,
        clearedBefore: 6,
        summary: { before: 8, content: "...", turn: 4 },
      },
      promptTokens: summarizeAt,
    })
  ).toBe("clear")
})

test("both steps sit just before the turn's model call", () => {
  expect(compactionSequence(7, "cleared")).toBe(697)
  expect(compactionSequence(7, "summarized")).toBe(698)
})

function plan(args: {
  compaction?: Parameters<typeof compactionPlan>[0]["compaction"]
  promptTokens: number | undefined
}) {
  return compactionPlan({
    compaction: args.compaction,
    promptTokens: args.promptTokens,
    turn: 5,
    window,
  })
}
