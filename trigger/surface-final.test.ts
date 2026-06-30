import { expect, test, vi } from "vitest"
import { executeToolCall, type ToolRuntime } from "./tool"
import { type ConvexId, type RuntimeTool } from "./types"

test("send_reply can finish the run after a successful final reply", async () => {
  const runtime = createRuntime()

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        final: true,
        text: "Done",
      },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
    sequence: 100,
  })

  expect(result.finished).toBe(true)
  expect(runtime.context.activeSurface?.communicated).toBe(true)
  expect(runtime.convex.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    runId: "run_1",
    text: "Done",
  })
})

test("send_reply final does not finish when delivery fails", async () => {
  const runtime = createRuntime()
  vi.mocked(runtime.convex.sendReply).mockRejectedValueOnce(
    new Error("Reply failed")
  )

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        final: true,
        text: "Done",
      },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
    sequence: 100,
  })

  expect(result.finished).toBe(false)
  expect(JSON.parse(result.content)).toEqual({
    error: { message: "Reply failed" },
    status: "error",
  })
  expect(runtime.context.activeSurface?.communicated).toBe(false)
})

test("add_reaction can finish the run after a successful final reaction", async () => {
  const runtime = createRuntime({ tools: [addReactionTool()] })

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        final: true,
        reaction: "white_check_mark",
        target: { messageTs: "123.456" },
      },
      id: "call_1",
      name: "add_reaction",
    },
    runtime,
    sequence: 100,
  })

  expect(result.finished).toBe(true)
  expect(runtime.context.activeSurface?.communicated).toBe(true)
  expect(runtime.convex.addReaction).toHaveBeenCalledWith({
    reaction: "white_check_mark",
    runId: "run_1",
    target: { messageTs: "123.456" },
  })
})

function createRuntime(options: { tools?: RuntimeTool[] } = {}): ToolRuntime {
  return {
    convex: {
      addReaction: vi.fn(async () => ({ status: "added" })),
      recordEvent: vi.fn(),
      sendReply: vi.fn(async () => ({ status: "sent" })),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: {
        communicated: false,
        surface: "slack",
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
      tools: options.tools ?? [sendReplyTool()],
    },
    sandbox: {} as ToolRuntime["sandbox"],
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

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
