import { expect, test, vi } from "vitest"
import { executeToolCall, type ToolRuntime } from "./tool"
import { type ConvexId, type RuntimeTool } from "./types"

test("finish_run requires a reason when an active surface has no reply", async () => {
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

test("finish_run completes automation runs without a reason", async () => {
  const runtime = createRuntime({ activeSurface: null })

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
    replied: false,
    status: "finished",
  })
})

function createRuntime(
  options: {
    activeSurface?: ToolRuntime["context"]["activeSurface"]
    replySent?: boolean
  } = {}
): ToolRuntime {
  return {
    convex: {
      recordEvent: vi.fn(),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: activeSurfaceState(options),
      prompt: "system",
      run: {
        id: id<"runs">("run_1"),
        rootId: null,
        sandboxId: null,
        status: "running",
        tenantId: "tenant",
      },
      session: null,
      tools: [finishRunTool()],
    },
    sandbox: {} as ToolRuntime["sandbox"],
  }
}

function activeSurfaceState(options: {
  activeSurface?: ToolRuntime["context"]["activeSurface"]
  replySent?: boolean
}): ToolRuntime["context"]["activeSurface"] {
  return "activeSurface" in options
    ? (options.activeSurface ?? null)
    : {
        replySent: options.replySent ?? false,
        surface: "slack",
      }
}

function finishRunTool(): RuntimeTool {
  return {
    access: "write",
    description: "Finish run.",
    inputSchema: {},
    name: "finish_run",
    route: "run",
  }
}

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
