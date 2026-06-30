import { expect, test, vi } from "vitest"
import { type ModelRuntime } from "../model/types"
import { type ToolRuntime } from "../tool"
import { type ConvexId, type RuntimeTool } from "../types"
import { runAgentLoop } from "./loop"
import { type QueuedModelResponse, queuedModelResponses } from "./test-model"

test("active surface stops are repaired back to finish_run", async () => {
  const runtime = createRuntime({
    tools: [sendReplyTool(), addReactionTool(), finishRunTool()],
  })
  const model = createModel([
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
    tools: [sendReplyTool(), githubCommentReactionTool(), finishRunTool()],
  })
  const model = createModel([
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
  const runtime = createRuntime({ tools: [sendReplyTool(), finishRunTool()] })
  const model = createModel([
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
  const runtime = createRuntime({ tools: [sendReplyTool(), finishRunTool()] })
  const model = createModel([
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

function createModel(responses: QueuedModelResponse[]) {
  const queue = queuedModelResponses(responses)

  return {
    complete: vi.fn(async () => {
      const response = queue.shift()

      if (response === undefined) {
        throw new Error("No model response queued.")
      }

      return response
    }),
  } satisfies ModelRuntime
}

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
      prompt: "system",
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

function githubCommentReactionTool(): RuntimeTool {
  return {
    access: "write",
    description: "Add GitHub comment reaction.",
    inputSchema: {},
    name: "github_add_comment_reaction",
    route: "convex",
    surface: "github",
  }
}

function sendReplyTool(): RuntimeTool {
  return {
    access: "write",
    description: "Send reply.",
    inputSchema: {},
    name: "send_reply",
    route: "surface",
  }
}

function addReactionTool(): RuntimeTool {
  return {
    access: "write",
    description: "Add reaction.",
    inputSchema: {},
    name: "add_reaction",
    route: "surface",
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

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
