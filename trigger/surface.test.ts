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

test("send_reply forwards the active Linear target by default", async () => {
  const runtime = createRuntime({
    activeSurface: {
      communicated: false,
      surface: "linear",
      target: "linear:thread:comment-id",
    },
  })

  await executeToolCall({
    attempt: 1,
    call: {
      args: { text: "Done" },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
    sequence: 100,
  })

  expect(runtime.convex.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    runId: "run_1",
    target: "linear:thread:comment-id",
    text: "Done",
  })
})

test("send_reply can override the active Linear target", async () => {
  const runtime = createRuntime({
    activeSurface: {
      communicated: false,
      surface: "linear",
      target: "linear:thread:old-comment-id",
    },
  })

  await executeToolCall({
    attempt: 1,
    call: {
      args: { target: "linear:issue:issue-id", text: "Issue-level update" },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
    sequence: 100,
  })

  expect(runtime.convex.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    runId: "run_1",
    target: "linear:issue:issue-id",
    text: "Issue-level update",
  })
  expect(runtime.context.activeSurface?.target).toBe("linear:issue:issue-id")
})

function createRuntime(
  options: {
    activeSurface?: ToolRuntime["context"]["activeSurface"]
    communicated?: boolean
    tools?: RuntimeTool[]
  } = {}
): ToolRuntime {
  return {
    convex: {
      recordEvent: vi.fn(),
      sendReply: vi.fn(async () => ({ status: "sent" })),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: options.activeSurface ?? {
        communicated: options.communicated ?? false,
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
    route: "active_surface",
  }
}

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
