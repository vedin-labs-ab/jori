import { expect, test, vi } from "vitest"
import { createRuntime, runTool, runtimeContext } from "../../../test/runtime"
import { type AgentRuntime } from "../platform"

test("prompted tools request approval without executing", async () => {
  const runtime = toolRuntime()

  const { content } = await runTool({
    call: promptedToolCall(),
    runtime,
  })

  expect(JSON.parse(content)).toEqual({
    approvalId: "approval_1",
    code: "ABC123",
    instruction: "Approval requested.",
    status: "approval_requested",
  })
  expect(runtime.platform.requestApproval).toHaveBeenCalledWith({
    input: promptedToolCall().args,
    runId: "run_1",
    surface: "notion",
    tool: "notion_create_page",
  })
  expect(runtime.platform.callTool).not.toHaveBeenCalled()
})

test("prompted tools carry the active reply target into approval delivery", async () => {
  const runtime = toolRuntime({
    activeSurface: {
      communicated: false,
      surface: "linear",
      target: "linear:thread:comment-id",
    },
  })

  await runTool({
    call: promptedToolCall(),
    runtime,
  })

  expect(runtime.platform.requestApproval).toHaveBeenCalledWith(
    expect.objectContaining({
      replyTarget: "linear:thread:comment-id",
    })
  )
})

test("prompted tools can finish the tool step with final", async () => {
  const runtime = toolRuntime()

  const result = await runTool({
    call: {
      ...promptedToolCall(),
      args: {
        ...promptedToolCall().args,
        final: true,
      },
    },
    runtime,
  })

  expect(result.finished).toBe(true)
  expect(runtime.platform.requestApproval).toHaveBeenCalledWith({
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
  const runtime = toolRuntime()

  const result = await runTool({
    call: {
      ...promptedToolCall(),
      args: {
        ...promptedToolCall().args,
        final: "true",
      },
    },
    runtime,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: { message: "final must be a boolean" },
    status: "error",
  })
  expect(runtime.platform.requestApproval).not.toHaveBeenCalled()
})

test("tool failures are returned to the agent instead of thrown", async () => {
  const runtime = toolRuntime({
    mode: "allowed",
  })
  runtime.platform.callTool = vi.fn(async () => {
    throw new Error("Provider rejected the request")
  })

  const { content } = await runTool({
    call: simpleToolCall(),
    runtime,
  })

  expect(JSON.parse(content)).toEqual({
    error: {
      message: "Provider rejected the request",
    },
    status: "error",
  })
  expect(runtime.platform.recordEvent).toHaveBeenCalledWith(
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

function toolRuntime(
  options: {
    activeSurface?: AgentRuntime["context"]["activeSurface"]
    mode?: "allowed" | "prompted"
  } = {}
): AgentRuntime {
  return createRuntime({
    context: runtimeContext({
      activeSurface: options.activeSurface ?? null,
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
    }),
  })
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
