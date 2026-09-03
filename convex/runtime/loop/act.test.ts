import { expect, test, vi } from "vitest"
import { type RuntimeTool } from "../../contracts/runtime/worker"
import { createQueuedModel, runtimeContext } from "../../test/trigger"
import { type AgentRuntime } from "../runtime"
import { runAgentLoop } from "./loop"

test.each([
  ["empty content", ""],
  ["literal double-quoted empty string", '""'],
  ["literal single-quoted empty string", "''"],
])("repairs %s stops back to finish_run", async (_label, content) => {
  const runtime = createRuntime()
  const model = createQueuedModel([
    { content, type: "stop" },
    {
      content: null,
      toolCalls: [
        {
          args: {},
          id: "call_1",
          name: "finish_run",
        },
      ],
      type: "tool_calls",
    },
  ])

  await expect(runAgentLoop({ attempt: 1, model, runtime })).resolves.toEqual({
    message: "",
    status: "completed",
  })
  expect(model.complete).toHaveBeenCalledTimes(2)
  expect(model.complete).toHaveBeenLastCalledWith(
    expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining("Call `finish_run`"),
          role: "user",
        }),
      ]),
      tools: [expect.objectContaining({ name: "finish_run" })],
    })
  )
  expect(runtime.platform.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

test("repairs a non-empty stop without disabling tools", async () => {
  const runtime = createRuntime({
    tools: [finishRunTool(), slackMessageTool()],
  })
  const model = createQueuedModel([
    { content: "I sent the result to Slack.", type: "stop" },
    {
      content: null,
      toolCalls: [
        {
          args: {},
          id: "call_1",
          name: "finish_run",
        },
      ],
      type: "tool_calls",
    },
  ])

  await runAgentLoop({ attempt: 1, model, runtime })

  expect(model.complete).toHaveBeenCalledTimes(2)
  expect(model.complete).toHaveBeenLastCalledWith(
    expect.objectContaining({
      messages: expect.arrayContaining([
        { content: "I sent the result to Slack.", role: "assistant" },
        expect.objectContaining({
          content: expect.stringContaining("Call `finish_run`"),
          role: "user",
        }),
      ]),
      tools: [
        expect.objectContaining({ name: "finish_run" }),
        expect.objectContaining({ name: "conversations_add_message" }),
      ],
    })
  )
})

test("allows tool calls after stop repair", async () => {
  const runtime = createRuntime({
    tools: [finishRunTool(), slackMessageTool()],
  })
  const model = createQueuedModel([
    { content: "Posting the answer.", type: "stop" },
    {
      content: null,
      toolCalls: [
        {
          args: {
            channel: "C123",
            text: "Posting the answer.",
          },
          id: "call_1",
          name: "conversations_add_message",
        },
        {
          args: {},
          id: "call_2",
          name: "finish_run",
        },
      ],
      type: "tool_calls",
    },
  ])

  await runAgentLoop({ attempt: 1, model, runtime })

  expect(runtime.platform.callTool).toHaveBeenCalledWith(
    expect.objectContaining({
      input: {
        channel: "C123",
        text: "Posting the answer.",
      },
      tool: "conversations_add_message",
    })
  )
  expect(runtime.platform.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

test("marks the run failed when model steps are exhausted", async () => {
  const runtime = createRuntime({
    tools: [finishRunTool(), slackMessageTool()],
  })
  const model = createQueuedModel(
    Array.from({ length: 30 }, (_value, index) => ({
      content: null,
      toolCalls: [
        {
          args: {
            channel: "C123",
            text: `attempt ${index}`,
          },
          id: `call_${index}`,
          name: "conversations_add_message",
        },
      ],
      type: "tool_calls" as const,
    }))
  )

  await expect(runAgentLoop({ attempt: 1, model, runtime })).resolves.toEqual({
    message: "",
    status: "failed",
  })

  expect(model.complete).toHaveBeenCalledTimes(30)
  expect(runtime.platform.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      data: { error: "Model loop exceeded the maximum step count." },
      type: "run.failed",
    })
  )
})

function createRuntime(options: { tools?: RuntimeTool[] } = {}): AgentRuntime {
  return {
    platform: {
      callTool: vi.fn(async () => ({ status: "sent" })),
      loadRunHandoffs: vi.fn(async () => ({ approvals: [], offers: [] })),
      recordEvent: vi.fn(),
      sendReply: vi.fn(async () => ({ status: "sent" })),
    },
    context: runtimeContext({
      tools: options.tools ?? [finishRunTool()],
    }),
    sandbox: {},
  } as unknown as AgentRuntime
}

function finishRunTool(): RuntimeTool {
  return {
    access: "write",
    description: "Finish run.",
    inputSchema: {},
    name: "finish_run",
    route: "run",
  }
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
