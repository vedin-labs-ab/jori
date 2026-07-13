import { expect, test, vi } from "vitest"
import { type ToolRuntime } from "../tool"
import { type ConvexId, type RuntimeTool } from "../types"
import { createQueuedModel } from "./fixture"
import { runAgentLoop } from "./loop"

test("active surface stops are repaired back to finish_run", async () => {
  const runtime = createRuntime({
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
            reason: "The requester only needed the automation to run.",
          },
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
  expect(runtime.convex.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

test("active surface repair uses send_reply even with provider reactions", async () => {
  const runtime = createRuntime({
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

  await runAgentLoop({ attempt: 1, model, runtime })

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
  const runtime = createRuntime({
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

  await runAgentLoop({ attempt: 1, model, runtime })

  expect(runtime.convex.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    runId: "run_1",
    text: "Here is the answer.",
  })
  expect(runtime.convex.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

test("active surface final replies complete without finish_run", async () => {
  const runtime = createRuntime({
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

  await runAgentLoop({ attempt: 1, model, runtime })

  expect(model.complete).toHaveBeenCalledTimes(1)
  expect(runtime.convex.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    runId: "run_1",
    text: "Here is the answer.",
  })
  expect(runtime.convex.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

function createRuntime(options: {
  surface?: "github" | "linear" | "slack"
  tools: RuntimeTool[]
}): ToolRuntime {
  return {
    convex: {
      addReaction: vi.fn(async () => ({ status: "added" })),
      callTool: vi.fn(),
      loadRunHandoffs: vi.fn(async () => ({ approvals: [], offers: [] })),
      recordEvent: vi.fn(),
      sendReply: vi.fn(async () => ({ status: "sent" })),
    },
    context: {
      activeSurface: {
        communicated: false,
        surface: options.surface ?? "slack",
        target: null,
      },
      drained: null,
      handoffs: { approvals: [], offers: [] },
      prompt: {
        context: "context",
        instructions: "system",
        organization: null,
        place: null,
        person: null,
        requester: null,
      },
      run: {
        id: id<"runs">("run_1"),
        rootId: null,
        sandboxId: null,
        status: "running",
        tenantId: "tenant",
      },
      session: null,
      tools: options.tools,
    },
    sandbox: {},
  } as unknown as ToolRuntime
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

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
