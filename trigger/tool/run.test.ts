import { expect, test, vi } from "vitest"
import { type RuntimeTool } from "../../contracts/runtime/worker"
import { runtimeId } from "../../test/trigger"
import { executeToolCall, type ToolRuntime } from "."

test("finish_run requires a reason when an active surface has no communication", async () => {
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
      message:
        "finish_run requires reason when no visible communication was sent.",
    },
    status: "error",
  })
})

test("finish_run completes after visible communication", async () => {
  const runtime = createRuntime({ communicated: true })

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
    communicated: true,
    reason: null,
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
    communicated: false,
    reason: null,
    status: "finished",
  })
})

test("finish_run stores its result on the context for the parent", async () => {
  const runtime = createRuntime({ activeSurface: null })

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: { result: "Summary of the delegated work." },
      id: "call_1",
      name: "finish_run",
    },
    runtime,
    sequence: 100,
  })

  expect(result.finished).toBe(true)
  expect(runtime.context.result).toBe("Summary of the delegated work.")
})

test("finish_run rejects an oversized result", async () => {
  const runtime = createRuntime({ activeSurface: null })

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: { result: "x".repeat(8001) },
      id: "call_1",
      name: "finish_run",
    },
    runtime,
    sequence: 100,
  })

  expect(result.finished).toBe(false)
  expect(runtime.context.result).toBeNull()
  expect(result.content).toContain("at most 8000 characters")
})

function createRuntime(
  options: {
    activeSurface?: ToolRuntime["context"]["activeSurface"]
    communicated?: boolean
  } = {}
): ToolRuntime {
  return {
    convex: {
      recordEvent: vi.fn(),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: activeSurfaceState(options),
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
        id: runtimeId<"runs">("run_1"),
        rootId: null,
        sandboxId: null,
        status: "running",
        organizationId: "organization",
      },
      result: null,
      session: null,
      tools: [finishRunTool()],
    },
    sandbox: {} as ToolRuntime["sandbox"],
  }
}

function activeSurfaceState(options: {
  activeSurface?: ToolRuntime["context"]["activeSurface"]
  communicated?: boolean
}): ToolRuntime["context"]["activeSurface"] {
  return "activeSurface" in options
    ? (options.activeSurface ?? null)
    : {
        communicated: options.communicated ?? false,
        surface: "slack",
        target: null,
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
