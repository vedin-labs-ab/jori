import { expect, test, vi } from "vitest"
import { executeToolCall, type ToolRuntime } from "../tool"
import { type ConvexId, type RuntimeTool } from "../types"

test("provider reaction tools mark the active surface communicated", async () => {
  const runtime = createRuntime({
    result: { ok: true },
    tool: linearReactionTool(),
  })

  await executeToolCall({
    attempt: 1,
    call: {
      args: { emoji: "👍", target: { id: "comment_1", type: "comment" } },
      id: "call_1",
      name: "linear_add_reaction",
    },
    runtime,
    sequence: 100,
  })

  expect(runtime.context.activeSurface?.communicated).toBe(true)
})

test("delivered integration offers mark the active surface communicated", async () => {
  const runtime = createRuntime({
    result: { delivery: { status: "delivered", surface: "slack" } },
    surface: "slack",
    tool: integrationOfferTool(),
  })

  await executeToolCall({
    attempt: 1,
    call: {
      args: { integration: "gmail", summary: "Gmail is needed here." },
      id: "call_1",
      name: "offer_integration",
    },
    runtime,
    sequence: 100,
  })

  expect(runtime.context.activeSurface?.communicated).toBe(true)
})

test("undelivered integration offers do not mark visible communication", async () => {
  const runtime = createRuntime({
    result: { delivery: { status: "created" } },
    surface: "slack",
    tool: integrationOfferTool(),
  })

  await executeToolCall({
    attempt: 1,
    call: {
      args: { integration: "gmail", summary: "Gmail is needed here." },
      id: "call_1",
      name: "offer_integration",
    },
    runtime,
    sequence: 100,
  })

  expect(runtime.context.activeSurface?.communicated).toBe(false)
})

function createRuntime(options: {
  result: unknown
  surface?: "github" | "linear" | "slack"
  tool: RuntimeTool
}): ToolRuntime {
  return {
    convex: {
      callTool: vi.fn(async () => options.result),
      recordEvent: vi.fn(),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: {
        communicated: false,
        surface: options.surface ?? "linear",
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
      tools: [options.tool],
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

function integrationOfferTool(): RuntimeTool {
  return {
    access: "write",
    description: "Offer integration.",
    inputSchema: {},
    mode: "required",
    name: "offer_integration",
    route: "convex",
    surface: "milo",
  }
}

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
