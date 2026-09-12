import { expect, test } from "vitest"
import { traceDoc } from "../../../test/convex/console"
import { projectModelTraces } from "./model"

test.each([
  {
    label: "finite",
    input: 1200,
    output: 80,
    expectedInput: 1200,
    expectedOutput: 80,
  },
  {
    label: "nonfinite",
    input: Number.NaN,
    output: Number.POSITIVE_INFINITY,
    expectedInput: 0,
    expectedOutput: 0,
  },
])(
  "projects $label token usage and trimmed, bounded reasoning for completed model steps",
  ({ input, output, expectedInput, expectedOutput }) => {
    const items = projectModelTraces(
      [
        traceDoc({
          data: {
            model: "  openai/gpt-5.6-sol  ",
            output: null,
            reasoning: `  ${"a".repeat(1500)}extra  `,
            usage: {
              durationMs: 3000,
              tokens: {
                cacheRead: 0,
                cacheWrite: 0,
                input,
                output,
                reasoning: 20,
                total: 1300,
                uncached: 0,
              },
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
        reasoning: "a".repeat(1500),
        tokenUsage: {
          model: "openai/gpt-5.6-sol",
          input: expectedInput,
          output: expectedOutput,
          reasoning: 20,
          total: 1300,
        },
      })
    )
  }
)

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
