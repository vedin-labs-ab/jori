import { expect, test, vi } from "vitest"
import { type ModelRuntime } from "../model/types"
import { type ToolRuntime } from "../tool"
import { type ConvexId, type RuntimeTool } from "../types"
import { runAgentLoop } from "./loop"

test.each([
  ["empty content", ""],
  ["literal double-quoted empty string", '""'],
  ["literal single-quoted empty string", "''"],
])("completes when the model stops with %s", async (_label, content) => {
  const runtime = createRuntime()
  const model = createModel([{ content, type: "stop" }])

  await expect(runAgentLoop({ attempt: 1, model, runtime })).resolves.toEqual({
    message: "",
    status: "completed",
  })
  expect(model.complete).toHaveBeenCalledTimes(1)
  expect(runtime.convex.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

test("repairs a non-empty stop once before completing", async () => {
  const runtime = createRuntime({
    tools: [slackMessageTool()],
  })
  const model = createModel([
    { content: "I sent the result to Slack.", type: "stop" },
    { content: "", type: "stop" },
  ])

  await runAgentLoop({ attempt: 1, model, runtime })

  expect(model.complete).toHaveBeenCalledTimes(2)
  expect(model.complete).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      tools: [
        expect.objectContaining({
          name: "conversations_add_message",
        }),
      ],
    })
  )
  expect(model.complete).toHaveBeenLastCalledWith(
    expect.objectContaining({
      messages: expect.arrayContaining([
        { content: "I sent the result to Slack.", role: "assistant" },
        expect.objectContaining({
          content: expect.stringContaining("Invalid stop"),
          role: "user",
        }),
      ]),
      tools: [],
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

test("fails tool calls during repair without executing them", async () => {
  const runtime = createRuntime({
    tools: [slackMessageTool()],
  })
  const model = createModel([
    { content: "Hey Albin! What can I help with?", type: "stop" },
    {
      content: null,
      toolCalls: [
        {
          args: {
            channel: "C123",
            text: "Hey Albin! What can I help with?",
          },
          id: "call_1",
          name: "conversations_add_message",
        },
      ],
      type: "tool_calls",
    },
  ])

  await expect(runAgentLoop({ attempt: 1, model, runtime })).rejects.toThrow(
    "Model returned tool calls during repair."
  )
  expect(runtime.convex.callTool).not.toHaveBeenCalled()
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

function createRuntime(options: { tools?: RuntimeTool[] } = {}): ToolRuntime {
  return {
    convex: {
      callTool: vi.fn(),
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
      tools: options.tools ?? [],
    },
    sandbox: {},
  } as unknown as ToolRuntime
}

function slackMessageTool(): RuntimeTool {
  return {
    access: "write",
    description: "Post a Slack message.",
    inputSchema: {},
    mode: "required",
    name: "conversations_add_message",
    route: "convex",
    surface: "slack",
  }
}

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
