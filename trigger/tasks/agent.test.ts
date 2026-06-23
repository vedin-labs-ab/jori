import { expect, test, vi } from "vitest"
import { type ModelRuntime } from "../model/types"
import { type ToolRuntime } from "../tool"
import { type ConvexId } from "../types"
import { runAgentLoop } from "./agent"

test("completes when the model stops with empty content", async () => {
  const runtime = createRuntime()
  const model = createModel([{ content: "", type: "stop" }])

  await expect(runAgentLoop({ attempt: 1, model, runtime })).resolves.toEqual({
    message: "",
    status: "completed",
  })
  expect(runtime.convex.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

test("repairs a non-empty stop once before completing", async () => {
  const runtime = createRuntime()
  const model = createModel([
    { content: "I sent the result to Slack.", type: "stop" },
    { content: "", type: "stop" },
  ])

  await runAgentLoop({ attempt: 1, model, runtime })

  expect(model.complete).toHaveBeenCalledTimes(2)
  expect(model.complete).toHaveBeenLastCalledWith(
    expect.objectContaining({
      messages: expect.arrayContaining([
        { content: "I sent the result to Slack.", role: "assistant" },
        expect.objectContaining({
          content: expect.stringContaining("Invalid stop"),
          role: "user",
        }),
      ]),
    })
  )
})

test("fails repeated non-empty stops", async () => {
  const runtime = createRuntime()
  const model = createModel([
    { content: "Here is the result.", type: "stop" },
    { content: "Still here.", type: "stop" },
  ])

  await expect(runAgentLoop({ attempt: 1, model, runtime })).rejects.toThrow(
    "Model returned non-empty stop content after repair."
  )
  expect(runtime.convex.recordEvent).not.toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

function createModel(
  responses: Awaited<ReturnType<ModelRuntime["complete"]>>[]
) {
  return {
    complete: vi.fn(async () => {
      const response = responses.shift()

      if (response === undefined) {
        throw new Error("No model response queued.")
      }

      return response
    }),
  } satisfies ModelRuntime
}

function createRuntime(): ToolRuntime {
  return {
    convex: {
      recordEvent: vi.fn(),
    },
    context: {
      prompt: "system",
      run: {
        id: id<"runs">("run_1"),
        rootId: null,
        sandboxId: null,
        status: "running",
        tenantId: "tenant",
      },
      session: null,
      tools: [],
    },
    sandbox: {},
  } as unknown as ToolRuntime
}

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
