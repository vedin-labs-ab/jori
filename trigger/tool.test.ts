import { beforeEach, expect, test, vi } from "vitest"
import { executeToolCall, type ToolRuntime } from "./tool"
import { type ConvexId } from "./types"

beforeEach(() => {
  vi.clearAllMocks()
})

test("prompted tools request approval without executing", async () => {
  const runtime = createRuntime()

  const { content } = await executeToolCall({
    attempt: 1,
    call: promptedToolCall(),
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(content)).toEqual({
    approvalId: "approval_1",
    code: "ABC123",
    instruction: "Approval requested.",
    status: "approval_requested",
  })
  expect(runtime.convex.requestApproval).toHaveBeenCalledWith({
    input: promptedToolCall().args,
    runId: "run_1",
    surface: "notion",
    tool: "notion_create_page",
  })
  expect(runtime.convex.callTool).not.toHaveBeenCalled()
})

test("prompted tools carry the active reply target into approval delivery", async () => {
  const runtime = createRuntime({
    activeSurface: {
      communicated: false,
      surface: "linear",
      target: "linear:thread:comment-id",
    },
  })

  await executeToolCall({
    attempt: 1,
    call: promptedToolCall(),
    runtime,
    sequence: 100,
  })

  expect(runtime.convex.requestApproval).toHaveBeenCalledWith(
    expect.objectContaining({
      replyTarget: "linear:thread:comment-id",
    })
  )
})

test("prompted tools can finish the tool step with final", async () => {
  const runtime = createRuntime()

  const result = await executeToolCall({
    attempt: 1,
    call: {
      ...promptedToolCall(),
      args: {
        ...promptedToolCall().args,
        final: true,
      },
    },
    runtime,
    sequence: 100,
  })

  expect(result.finished).toBe(true)
  expect(runtime.convex.requestApproval).toHaveBeenCalledWith({
    input: {
      ...promptedToolCall().args,
      final: true,
    },
    runId: "run_1",
    surface: "notion",
    tool: "notion_create_page",
  })
})

test("prompted tools reject invalid final before requesting approval", async () => {
  const runtime = createRuntime()

  const result = await executeToolCall({
    attempt: 1,
    call: {
      ...promptedToolCall(),
      args: {
        ...promptedToolCall().args,
        final: "true",
      },
    },
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: { message: "final must be a boolean" },
    status: "error",
  })
  expect(runtime.convex.requestApproval).not.toHaveBeenCalled()
})

test("tool failures are returned to the agent instead of thrown", async () => {
  const runtime = createRuntime({
    mode: "allowed",
  })
  runtime.convex.callTool = vi.fn(async () => {
    throw new Error("Provider rejected the request")
  })

  const { content } = await executeToolCall({
    attempt: 1,
    call: simpleToolCall(),
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(content)).toEqual({
    error: {
      message: "Provider rejected the request",
    },
    status: "error",
  })
  expect(runtime.convex.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        error: "Provider rejected the request",
        input: simpleToolCall().args,
        tool: {
          access: "write",
          name: "notion_create_page",
          route: "convex",
        },
      },
      type: "tool.failed",
    })
  )
})

function createRuntime(
  options: {
    activeSurface?: ToolRuntime["context"]["activeSurface"]
    mode?: "allowed" | "prompted"
  } = {}
): ToolRuntime {
  return {
    convex: {
      callTool: vi.fn(),
      recordEvent: vi.fn(),
      requestApproval: vi.fn(async () => ({
        approvalId: id<"approvals">("approval_1"),
        code: "ABC123",
        instruction: "Approval requested.",
        status: "approval_requested",
      })),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: options.activeSurface ?? null,
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
      tools: [
        {
          access: "write",
          description: "Create a Notion page.",
          inputSchema: {},
          mode: options.mode ?? "prompted",
          name: "notion_create_page",
          route: "convex",
          surface: "notion",
        },
      ],
    },
    sandbox: {} as ToolRuntime["sandbox"],
  }
}

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}

function promptedToolCall() {
  return {
    args: {
      approval: {
        summary: "Create launch notes in Notion.",
      },
      title: "Launch notes",
    },
    id: "call_1",
    name: "notion_create_page",
  }
}

function simpleToolCall() {
  return {
    args: {
      parent: {
        page_id: "page_1",
      },
      properties: {
        Företag: {
          title: [{ text: { content: "Vedin Labs" } }],
        },
        "Status 😀": {
          rich_text: [{ text: { content: "Ready" } }],
        },
      },
    },
    id: "call_1",
    name: "notion_create_page",
  }
}
