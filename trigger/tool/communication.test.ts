import { expect, test, vi } from "vitest"
import { type RuntimeTool } from "../../contracts/runtime/worker"
import { runtimeId } from "../../test/trigger"
import { type AgentRuntime } from "../runtime"
import { executeToolCall } from "../tool"

test.each([
  [
    "github",
    providerTool("github", "github_add_comment_reaction"),
    {
      content: "+1",
      owner: "acme",
      repo: "app",
      commentId: 123,
      subject: "issue_comment",
    },
    "github_add_comment_reaction",
  ],
  [
    "linear",
    providerTool("linear", "linear_add_reaction"),
    { emoji: "👍", target: { id: "comment_1", type: "comment" } },
    "linear_add_reaction",
  ],
  [
    "slack",
    providerTool("slack", "slack_add_reaction"),
    { channel: "C123", name: "thumbsup", timestamp: "123.456" },
    "slack_add_reaction",
  ],
] as const)("%s reaction tools do not mark the active surface communicated", async (surface, tool, args, name) => {
  const runtime = createRuntime({
    result: { ok: true },
    surface,
    tool,
  })

  await executeToolCall({
    attempt: 1,
    call: {
      args,
      id: "call_1",
      name,
    },
    runtime,
    sequence: 100,
  })

  expect(runtime.context.activeSurface?.communicated).toBe(false)
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

test("final integration offers finish the tool step", async () => {
  const runtime = createRuntime({
    result: {
      delivery: { status: "delivered", surface: "slack" },
    },
    surface: "slack",
    tool: integrationOfferTool(),
  })

  const result = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        final: true,
        integration: "gmail",
        summary: "Gmail is needed here.",
      },
      id: "call_1",
      name: "offer_integration",
    },
    runtime,
    sequence: 100,
  })

  expect(result.finished).toBe(true)
  expect(runtime.context.activeSurface?.communicated).toBe(true)
})

test.each([
  ["delivered", { delivery: { status: "delivered" } }],
  ["not delivered", { delivery: { status: "created" } }],
  ["already connected", { status: "connected" }],
] as const)("integration offers do not finish without final when %s", async (_label, result) => {
  const runtime = createRuntime({
    result,
    surface: "slack",
    tool: integrationOfferTool(),
  })

  const output = await executeToolCall({
    attempt: 1,
    call: {
      args: {
        integration: "gmail",
        summary: "Gmail is needed here.",
      },
      id: "call_1",
      name: "offer_integration",
    },
    runtime,
    sequence: 100,
  })

  expect(output.finished).toBe(false)
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
}): AgentRuntime {
  return {
    platform: {
      callTool: vi.fn(async () => options.result),
      recordEvent: vi.fn(),
    } as unknown as AgentRuntime["platform"],
    context: {
      activeSurface: {
        communicated: false,
        surface: options.surface ?? "linear",
        target: null,
      },
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
      tools: [options.tool],
    },
    sandbox: {} as AgentRuntime["sandbox"],
  }
}

function providerTool(
  surface: "github" | "linear" | "slack",
  name: string
): RuntimeTool {
  return {
    access: "write",
    description: "Provider tool.",
    inputSchema: {},
    mode: "allowed",
    name,
    route: "convex",
    surface,
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
    surface: "jori",
  }
}
