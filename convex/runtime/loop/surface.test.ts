import { expect, test } from "vitest"
import {
  createQueuedModel,
  createRuntime,
  runLoop,
  runtimeContext,
} from "../../../test/runtime"
import { type RuntimeTool } from "../platform/types"

test("active surface stops are repaired back to finish_run", async () => {
  const runtime = surfaceRuntime({
    tools: [
      runtimeTool("send_reply", "surface"),
      runtimeTool("add_reaction", "surface"),
      runtimeTool("finish_run", "run"),
    ],
  })
  const model = createQueuedModel([
    { content: "", type: "stop" },
    {
      content: null,
      toolCalls: [
        {
          args: {
            reason: "The requester only needed the job to run.",
          },
          id: "call_1",
          name: "finish_run",
        },
      ],
      type: "tool_calls",
    },
  ])

  await runLoop({ model, runtime })

  expect(model.complete).toHaveBeenCalledTimes(2)
  expect(model.complete).toHaveBeenLastCalledWith(
    expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining("call `finish_run`"),
          role: "user",
        }),
        expect.objectContaining({
          content: expect.stringContaining(
            "visible communication with `send_reply` or `add_reaction`"
          ),
          role: "user",
        }),
      ]),
      tools: [
        expect.objectContaining({ name: "send_reply" }),
        expect.objectContaining({ name: "add_reaction" }),
        expect.objectContaining({ name: "finish_run" }),
      ],
    })
  )
  expect(runtime.platform.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

test("active surface repair uses send_reply even with provider reactions", async () => {
  const runtime = surfaceRuntime({
    surface: "github",
    tools: [
      runtimeTool("send_reply", "surface"),
      runtimeTool("github_add_comment_reaction", "convex", "github"),
      runtimeTool("finish_run", "run"),
    ],
  })
  const model = createQueuedModel([
    { content: "", type: "stop" },
    {
      content: null,
      toolCalls: [
        {
          args: {
            reason: "The requester only needed an acknowledgement.",
          },
          id: "call_1",
          name: "finish_run",
        },
      ],
      type: "tool_calls",
    },
  ])

  await runLoop({ model, runtime })

  expect(model.complete).toHaveBeenLastCalledWith(
    expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining(
            "visible communication with `send_reply`"
          ),
          role: "user",
        }),
      ]),
    })
  )
  expect(model.complete).toHaveBeenLastCalledWith(
    expect.objectContaining({
      messages: expect.not.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining("surface-specific reaction"),
          role: "user",
        }),
      ]),
    })
  )
})

test("active surface replies complete only after finish_run", async () => {
  const runtime = surfaceRuntime({
    tools: [
      runtimeTool("send_reply", "surface"),
      runtimeTool("finish_run", "run"),
    ],
  })
  const model = createQueuedModel([
    { content: "Here is the answer.", type: "stop" },
    {
      content: null,
      toolCalls: [
        {
          args: {
            text: "Here is the answer.",
          },
          id: "call_1",
          name: "send_reply",
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

  await runLoop({ model, runtime })

  expect(runtime.platform.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    runId: "run_1",
    text: "Here is the answer.",
  })
  expect(runtime.platform.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

test("active surface final replies complete without finish_run", async () => {
  const runtime = surfaceRuntime({
    tools: [
      runtimeTool("send_reply", "surface"),
      runtimeTool("finish_run", "run"),
    ],
  })
  const model = createQueuedModel([
    {
      content: null,
      toolCalls: [
        {
          args: {
            final: true,
            text: "Here is the answer.",
          },
          id: "call_1",
          name: "send_reply",
        },
      ],
      type: "tool_calls",
    },
  ])

  await runLoop({ model, runtime })

  expect(model.complete).toHaveBeenCalledTimes(1)
  expect(runtime.platform.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    runId: "run_1",
    text: "Here is the answer.",
  })
  expect(runtime.platform.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

function surfaceRuntime(options: {
  surface?: "github" | "linear" | "slack"
  tools: RuntimeTool[]
}) {
  return createRuntime({
    context: runtimeContext({
      activeSurface: {
        communicated: false,
        surface: options.surface ?? "slack",
        target: null,
      },
      tools: options.tools,
    }),
  })
}

function runtimeTool(
  name: string,
  route: RuntimeTool["route"],
  surface?: RuntimeTool["surface"]
): RuntimeTool {
  return {
    access: "write",
    description: `${name} tool`,
    inputSchema: {},
    name,
    route,
    ...(surface === undefined ? {} : { surface }),
  }
}
