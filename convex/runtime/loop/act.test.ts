import { expect, test } from "vitest"
import { type RuntimeTool } from "../../../contracts/runtime/context"
import {
  createQueuedModel,
  createRuntime,
  runLoop,
  runtimeContext,
} from "../../../test/runtime"

test("repairs empty stops back to finish_run", async () => {
  const runtime = createRuntime({
    context: runtimeContext({ tools: [finishRunTool()] }),
  })
  const model = createQueuedModel([
    { content: "", type: "stop" },
    finishRunResponse(),
  ])

  await expect(runLoop({ model, runtime })).resolves.toBe("completed")
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

test("repairs non-empty stops and keeps tools available for the next turn", async () => {
  const runtime = createRuntime({
    context: runtimeContext({ tools: [finishRunTool(), slackMessageTool()] }),
  })
  const model = createQueuedModel([
    { content: "Posting the answer.", type: "stop" },
    {
      content: null,
      toolCalls: [
        {
          args: { channel: "C123", text: "Posting the answer." },
          id: "call_1",
          name: "conversations_add_message",
        },
        { args: {}, id: "call_2", name: "finish_run" },
      ],
      type: "tool_calls",
    },
  ])

  await runLoop({ model, runtime })

  expect(model.complete).toHaveBeenCalledTimes(2)
  expect(model.complete).toHaveBeenLastCalledWith(
    expect.objectContaining({
      messages: expect.arrayContaining([
        { content: "Posting the answer.", role: "assistant" },
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
  expect(runtime.platform.callTool).toHaveBeenCalledWith(
    expect.objectContaining({
      input: { channel: "C123", text: "Posting the answer." },
      tool: "conversations_add_message",
    })
  )
  expect(runtime.platform.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

test.each([
  "tool_calls",
  "stop",
] as const)("fails when the model exhausts its steps with %s responses", async (type) => {
  const runtime = createRuntime({
    context: runtimeContext({ tools: [finishRunTool(), slackMessageTool()] }),
  })
  const model = createQueuedModel(
    Array.from({ length: 30 }, (_value, index) =>
      type === "stop"
        ? { content: "Still thinking.", type }
        : {
            content: null,
            toolCalls: [
              {
                args: { channel: "C123", text: `attempt ${index}` },
                id: `call_${index}`,
                name: "conversations_add_message",
              },
            ],
            type,
          }
    )
  )

  await expect(runLoop({ model, runtime })).resolves.toBe("failed")

  expect(model.complete).toHaveBeenCalledTimes(30)
  expect(runtime.platform.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      data: { error: "Model loop exceeded the maximum step count." },
      type: "run.failed",
    })
  )
})

test("answers the calls a finishing call leaves behind", async () => {
  const runtime = createRuntime({
    context: runtimeContext({ tools: [finishRunTool(), slackMessageTool()] }),
  })
  const model = createQueuedModel([
    {
      content: null,
      toolCalls: [
        { args: {}, id: "call_1", name: "finish_run" },
        {
          args: { channel: "C123", text: "Too late." },
          id: "call_2",
          name: "conversations_add_message",
        },
      ],
      type: "tool_calls",
    },
  ])

  await expect(runLoop({ model, runtime })).resolves.toBe("completed")

  expect(runtime.platform.callTool).not.toHaveBeenCalled()
  await expect(runtime.platform.listTranscript()).resolves.toContainEqual(
    expect.objectContaining({
      content: expect.stringContaining("skipped"),
      role: "tool",
      toolCallId: "call_2",
    })
  )
})

function finishRunResponse() {
  return {
    content: null,
    toolCalls: [{ args: {}, id: "call_1", name: "finish_run" }],
    type: "tool_calls" as const,
  }
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
