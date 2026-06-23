import { wait } from "@trigger.dev/sdk/v3"
import { beforeEach, expect, test, vi } from "vitest"
import { approvalWaitTimeout } from "../contracts/approvals"
import { executeToolCall, type ToolRuntime } from "./tool"
import { type ConvexId } from "./types"

vi.mock("@trigger.dev/sdk/v3", () => ({
  wait: {
    createToken: vi.fn(),
    forToken: vi.fn(),
  },
}))

const waitMock = vi.mocked(wait)

beforeEach(() => {
  vi.clearAllMocks()
  waitMock.createToken.mockResolvedValue({
    id: "waitpoint_1",
  } as Awaited<ReturnType<typeof wait.createToken>>)
})

test("prompted tools wait for approval before executing", async () => {
  const runtime = createRuntime()

  waitMock.forToken.mockResolvedValue({
    ok: true,
    output: {
      approvalId: "approval_1",
      decision: "approved",
    },
  })
  runtime.convex.callTool = vi.fn(async () => ({ ok: true }))

  const { content } = await executeToolCall({
    attempt: 1,
    call: promptedToolCall(),
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(content)).toEqual({ ok: true })
  expect(waitMock.createToken).toHaveBeenCalledWith({
    idempotencyKey: "run_1:call_1",
    tags: ["run_1", "tool:notion_create_page"],
    timeout: approvalWaitTimeout,
  })
  expect(runtime.convex.requestApproval).toHaveBeenCalledWith({
    input: promptedToolCall().args,
    runId: "run_1",
    surface: "notion",
    tool: "notion_create_page",
    waitpointId: "waitpoint_1",
  })
  expect(runtime.convex.callTool).toHaveBeenCalledWith({
    approved: true,
    input: { title: "Launch notes" },
    runId: "run_1",
    surface: "notion",
    tool: "notion_create_page",
  })
})

test("prompted tools return denied results without executing", async () => {
  const runtime = createRuntime()

  waitMock.forToken.mockResolvedValue({
    ok: true,
    output: {
      approvalId: "approval_1",
      decision: "denied",
    },
  })

  const { content } = await executeToolCall({
    attempt: 1,
    call: promptedToolCall(),
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(content)).toEqual({
    approvalId: "approval_1",
    status: "denied",
  })
  expect(runtime.convex.callTool).not.toHaveBeenCalled()
})

test("prompted tools return repairable validation errors before approval", async () => {
  const runtime = createRuntime()

  const { content } = await executeToolCall({
    attempt: 1,
    call: promptedToolCall({ approval: false }),
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(content)).toEqual({
    error: {
      message:
        "Tool requires approval: notion_create_page. Include approval.summary as a 1-500 character user-facing sentence describing the exact action. Retry the same tool call with approval.summary included.",
    },
    status: "error",
  })
  expect(waitMock.createToken).not.toHaveBeenCalled()
  expect(runtime.convex.requestApproval).not.toHaveBeenCalled()
  expect(runtime.convex.callTool).not.toHaveBeenCalled()
})

test("prompted tools reject blank approval summaries before approval", async () => {
  const runtime = createRuntime()

  const { content } = await executeToolCall({
    attempt: 1,
    call: promptedToolCall({ summary: " " }),
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(content)).toMatchObject({
    error: {
      message: expect.stringContaining("Include approval.summary"),
    },
    status: "error",
  })
  expect(waitMock.createToken).not.toHaveBeenCalled()
  expect(runtime.convex.requestApproval).not.toHaveBeenCalled()
})

test("prompted tools return expired results on waitpoint timeout", async () => {
  const runtime = createRuntime()

  waitMock.forToken.mockResolvedValue({
    error: new Error("Waitpoint timed out"),
    ok: false,
  })

  const { content } = await executeToolCall({
    attempt: 1,
    call: promptedToolCall(),
    runtime,
    sequence: 100,
  })

  expect(JSON.parse(content)).toEqual({
    approvalId: "approval_1",
    status: "expired",
  })
  expect(runtime.convex.callTool).not.toHaveBeenCalled()
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
        access: "write",
        error: "Provider rejected the request",
        name: "notion_create_page",
        route: "convex",
      },
      type: "tool.failed",
    })
  )
})

function createRuntime(
  options: { mode?: "allowed" | "prompted" } = {}
): ToolRuntime {
  return {
    convex: {
      callTool: vi.fn(),
      recordEvent: vi.fn(),
      requestApproval: vi.fn(async () => ({
        approvalId: id<"approvals">("approval_1"),
      })),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: null,
      prompt: "system",
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

function promptedToolCall(
  options: { approval?: boolean; summary?: string } = {}
) {
  const includeApproval = options.approval ?? true

  return {
    args: {
      ...(includeApproval
        ? {
            approval: {
              summary: options.summary ?? "Create launch notes in Notion.",
            },
          }
        : {}),
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
