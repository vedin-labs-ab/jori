import { expect, test, vi } from "vitest"
import { executeToolCall, type ToolRuntime } from "./tool"
import { type ConvexId, type RuntimeTool } from "./types"

test("provider reaction tools mark the active surface communicated", async () => {
  const runtime = createRuntime()

  await executeToolCall({
    attempt: 1,
    call: {
      args: { commentId: "comment_1", emoji: "👍" },
      id: "call_1",
      name: "linear_add_reaction",
    },
    runtime,
    sequence: 100,
  })

  expect(runtime.context.activeSurface?.communicated).toBe(true)
})

function createRuntime(): ToolRuntime {
  return {
    convex: {
      callTool: vi.fn(async () => ({ ok: true })),
      recordEvent: vi.fn(),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: { communicated: false, surface: "linear" },
      prompt: "system",
      run: {
        id: id<"runs">("run_1"),
        rootId: null,
        sandboxId: null,
        status: "running",
        tenantId: "tenant",
      },
      session: null,
      tools: [linearReactionTool()],
    },
    sandbox: {} as ToolRuntime["sandbox"],
  }
}

function linearReactionTool(): RuntimeTool {
  return {
    access: "write",
    description: "Add Linear reaction.",
    inputSchema: {},
    mode: "allowed",
    name: "linear_add_reaction",
    route: "convex",
    surface: "linear",
  }
}

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
