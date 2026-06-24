import { expect, test, vi } from "vitest"
import { executeToolCall, type ToolRuntime } from "./tool"
import { type ConvexId, type RuntimeTool } from "./types"

test("send_reply routes through Convex and marks the active surface communicated", async () => {
  const runtime = createRuntime()

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        blocks: [{ text: { text: "Done", type: "mrkdwn" }, type: "section" }],
        text: "Done",
      },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
    sequence: 100,
  })

  expect(result.finished).toBe(false)
  expect(JSON.parse(result.content)).toEqual({ status: "sent" })
  expect(runtime.context.activeSurface?.communicated).toBe(true)
  expect(runtime.convex.sendReply).toHaveBeenCalledWith({
    blocks: [{ text: { text: "Done", type: "mrkdwn" }, type: "section" }],
    runId: "run_1",
    text: "Done",
  })
})

test("add_reaction routes through Convex and marks the active surface communicated", async () => {
  const runtime = createRuntime({ tools: [addReactionTool()] })

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        emoji: ":eyes:",
      },
      id: "call_1",
      name: "add_reaction",
    },
    runtime,
    sequence: 100,
  })

  expect(result.finished).toBe(false)
  expect(JSON.parse(result.content)).toEqual({ status: "sent" })
  expect(runtime.context.activeSurface?.communicated).toBe(true)
  expect(runtime.convex.addReaction).toHaveBeenCalledWith({
    emoji: ":eyes:",
    runId: "run_1",
  })
})

function createRuntime(
  options: { communicated?: boolean; tools?: RuntimeTool[] } = {}
): ToolRuntime {
  return {
    convex: {
      addReaction: vi.fn(async () => ({ status: "sent" })),
      recordEvent: vi.fn(),
      sendReply: vi.fn(async () => ({ status: "sent" })),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: {
        communicated: options.communicated ?? false,
        surface: "slack",
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

function addReactionTool(): RuntimeTool {
  return {
    access: "write",
    description: "Add reaction.",
    inputSchema: {},
    name: "add_reaction",
    route: "active_surface",
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

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
