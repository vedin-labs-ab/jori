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

test("send_reply can target a specific Linear comment", async () => {
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
      args: { commentId: "new-comment-id", text: "Comment-level update" },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
    sequence: 100,
  })

  expect(runtime.convex.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    runId: "run_1",
    target: "linear:thread:new-comment-id",
    text: "Comment-level update",
  })
  expect(runtime.context.activeSurface?.target).toBe(
    "linear:thread:new-comment-id"
  )
})

test("add_reaction routes through Convex and marks the active surface communicated", async () => {
  const runtime = createRuntime({ tools: [addReactionTool()] })

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        reaction: "white_check_mark",
        target: { messageTs: "123.456" },
      },
      id: "call_1",
      name: "add_reaction",
    },
    runtime,
    sequence: 100,
  })

  expect(result.finished).toBe(false)
  expect(JSON.parse(result.content)).toEqual({ status: "added" })
  expect(runtime.context.activeSurface?.communicated).toBe(true)
  expect(runtime.convex.addReaction).toHaveBeenCalledWith({
    reaction: "white_check_mark",
    runId: "run_1",
    target: { messageTs: "123.456" },
  })
})

test("add_reaction validates GitHub reaction targets before calling Convex", async () => {
  const runtime = createRuntime({
    activeSurface: {
      communicated: false,
      surface: "github",
      target: null,
    },
    tools: [addReactionTool()],
  })

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        reaction: "+1",
        target: { commentId: "123", type: "comment" },
      },
      id: "call_1",
      name: "add_reaction",
    },
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: {
      message: "target.commentId must be a positive integer",
    },
    status: "error",
  })
  expect(runtime.convex.addReaction).not.toHaveBeenCalled()
})

test("add_reaction validates GitHub reaction values before calling Convex", async () => {
  const runtime = createRuntime({
    activeSurface: {
      communicated: false,
      surface: "github",
      target: null,
    },
    tools: [addReactionTool()],
  })

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        reaction: "thumbsup",
        target: { commentId: 123, type: "comment" },
      },
      id: "call_1",
      name: "add_reaction",
    },
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: {
      message:
        "reaction must be one of +1, -1, laugh, confused, heart, hooray, rocket, eyes",
    },
    status: "error",
  })
  expect(runtime.convex.addReaction).not.toHaveBeenCalled()
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
      addReaction: vi.fn(async () => ({ status: "added" })),
      recordEvent: vi.fn(),
      sendReply: vi.fn(async () => ({ status: "sent" })),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: options.activeSurface ?? {
        communicated: options.communicated ?? false,
        surface: "slack",
        target: null,
      },
      prompt: {
        context: "context",
        instructions: "system",
        organization: null,
      },
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
