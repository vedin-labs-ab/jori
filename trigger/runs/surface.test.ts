import { expect, test, vi } from "vitest"
import { type ModelRuntime } from "../model/types"
import { type ToolRuntime } from "../tool"
import { type ConvexId, type RuntimeTool } from "../types"
import { runAgentLoop } from "./loop"

test("active surface stops are repaired back to finish_run", async () => {
  const runtime = createRuntime({ tools: [sendReplyTool(), finishRunTool()] })
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
      ]),
      tools: [
        expect.objectContaining({ name: "send_reply" }),
        expect.objectContaining({ name: "finish_run" }),
      ],
    })
  )
  expect(runtime.convex.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: "run.completed" })
  )
})

test("GitHub active surface repair can use reactions", async () => {
  const runtime = createRuntime({
    surface: "github",
    tools: [sendReplyTool(), githubReactionTool(), finishRunTool()],
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
            "`send_reply` or the surface-specific reaction tool"
          ),
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

function createRuntime(options: {
  surface?: "github" | "linear" | "slack"
  tools: RuntimeTool[]
}): ToolRuntime {
  return {
    convex: {
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

function githubReactionTool(): RuntimeTool {
  return {
    access: "write",
    description: "Add GitHub reaction.",
    inputSchema: {},
    name: "github_add_reaction",
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
    route: "active_surface",
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
