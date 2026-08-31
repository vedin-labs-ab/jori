import { expect, test } from "vitest"
import { traceDoc } from "../../../test/convex/console"
import { projectModelTraces } from "./model"

test("projects token usage for completed model steps", () => {
  const items = projectModelTraces(
    [
      traceDoc({
        data: {
          output: null,
          reasoning: null,
          usage: {
            durationMs: 3000,
            inputCacheReadTokens: 0,
            inputCacheWriteTokens: 0,
            inputTokens: 1200,
            inputUncachedTokens: 0,
            outputTokens: 80,
            reasoningTokens: 20,
            totalTokens: 1300,
            toolCalls: 1,
          },
        },
        sequence: 99,
        timestamp: 20,
        type: "model.completed",
      }),
    ],
    true
  )

  expect(items).toContainEqual(
    expect.objectContaining({
      description: "Selected 1 action.",
      kind: "model",
      tokenUsage: {
        input: 1200,
        output: 80,
        reasoning: 20,
        total: 1300,
      },
    })
  )
})

test("projects bounded reasoning for completed model steps", () => {
  const items = projectModelTraces(
    [
      traceDoc({
        data: {
          output: null,
          reasoning: `${"a".repeat(1500)}extra`,
          usage: {
            durationMs: 3000,
            inputCacheReadTokens: 0,
            inputCacheWriteTokens: 0,
            inputTokens: 1200,
            inputUncachedTokens: 0,
            outputTokens: 80,
            reasoningTokens: 20,
            totalTokens: 1300,
            toolCalls: 0,
          },
        },
        sequence: 99,
        timestamp: 20,
        type: "model.completed",
      }),
    ],
    true
  )

  expect(items[0]?.reasoning).toBe("a".repeat(1500))
})

test("does not project reasoning for failed model steps", () => {
  const failedData = {
    error: "request failed",
    reasoning: "partial thought",
  } as { error: string }

  const items = projectModelTraces(
    [
      traceDoc({
        data: failedData,
        sequence: 99,
        timestamp: 20,
        type: "model.failed",
      }),
    ],
    true
  )

  expect(items[0]).not.toHaveProperty("reasoning")
})
