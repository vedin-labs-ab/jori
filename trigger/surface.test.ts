import { expect, test, vi } from "vitest"
import { executeToolCall, type ToolRuntime } from "./tool"
import { type ConvexId, type RuntimeTool } from "./types"

test("send_reply routes through Convex and marks the active surface replied", async () => {
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
  expect(runtime.context.activeSurface?.replySent).toBe(true)
  expect(runtime.convex.sendReply).toHaveBeenCalledWith({
    blocks: [{ text: { text: "Done", type: "mrkdwn" }, type: "section" }],
    runId: "run_1",
    text: "Done",
  })
})

test("finish_run requires a reason when no reply was sent", async () => {
  const runtime = createRuntime()

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {},
      id: "call_1",
      name: "finish_run",
    },
    runtime,
    sequence: 100,
  })

  expect(result.finished).toBe(false)
  expect(JSON.parse(result.content)).toEqual({
    error: {
      message: "finish_run requires reason when no reply was sent.",
    },
    status: "error",
  })
})

test("finish_run completes after a reply", async () => {
  const runtime = createRuntime({ replySent: true })

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {},
      id: "call_1",
      name: "finish_run",
    },
    runtime,
    sequence: 100,
  })

  expect(result.finished).toBe(true)
  expect(JSON.parse(result.content)).toEqual({
    reason: null,
    replied: true,
    status: "finished",
  })
})

function createRuntime(options: { replySent?: boolean } = {}): ToolRuntime {
  return {
    convex: {
      recordEvent: vi.fn(),
      sendReply: vi.fn(async () => ({ status: "sent" })),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: {
        replySent: options.replySent ?? false,
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
      tools: [sendReplyTool(), finishRunTool()],
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
    route: "active_surface",
  }
}

function finishRunTool(): RuntimeTool {
  return {
    access: "write",
    description: "Finish run.",
    inputSchema: {},
    name: "finish_run",
    route: "active_surface",
  }
}

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
