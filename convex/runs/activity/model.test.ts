import { expect, test } from "vitest"
import { type Doc, type Id, type TableNames } from "../../_generated/dataModel"
import { projectModelTraces } from "./model"

test("projects token usage for completed model steps", () => {
  const items = projectModelTraces(
    [
      trace({
        data: {
          metrics: {
            durationMs: 3000,
            inputTokens: 1200,
            outputTokens: 80,
            reasoningTokens: 20,
            totalTokens: 1300,
            toolCalls: 1,
          },
          status: "completed",
          summary: "Selected 1 action.",
          title: "Model step completed",
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
      description: undefined,
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

function trace(
  overrides: Partial<Doc<"traces">> & Pick<Doc<"traces">, "timestamp" | "type">
): Doc<"traces"> {
  return {
    _creationTime: overrides.timestamp,
    _id: id<"traces">(`trace-${overrides.timestamp}`),
    callId: undefined,
    key: `trace:${overrides.timestamp}`,
    runId: id<"runs">("run"),
    sequence: undefined,
    source: "trigger.model",
    tenantId: "tenant",
    ...overrides,
  } as Doc<"traces">
}

function id<TableName extends TableNames>(value: string) {
  return value as Id<TableName>
}
