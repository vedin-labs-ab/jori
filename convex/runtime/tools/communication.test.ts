import { expect, test, vi } from "vitest"
import { type RuntimeTool } from "../../../contracts/runtime/context"
import { createPlatform } from "../../../test/platform"
import { createRuntime, runTool, runtimeContext } from "../../../test/runtime"
import { type AgentRuntime } from "../platform"

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
  const runtime = communicationRuntime({
    result: { ok: true },
    surface,
    tool,
  })

  await runTool({
    call: {
      args,
      id: "call_1",
      name,
    },
    runtime,
  })

  expect(runtime.context.activeSurface?.communicated).toBe(false)
})

test("final integration offers finish the tool step", async () => {
  const runtime = communicationRuntime({
    result: {
      delivery: { status: "delivered", surface: "slack" },
    },
    surface: "slack",
    tool: integrationOfferTool(),
  })

  const result = await runTool({
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
  })

  expect(result.finished).toBe(true)
  expect(runtime.context.activeSurface?.communicated).toBe(true)
})

test.each([
  [
    "delivered on the active surface",
    { delivery: { status: "delivered", surface: "slack" } },
    true,
  ],
  ["delivered without a surface", { delivery: { status: "delivered" } }, false],
  ["not delivered", { delivery: { status: "created" } }, false],
  ["already connected", { status: "connected" }, false],
] as const)("integration offers continue without final when %s", async (_label, result, communicated) => {
  const runtime = communicationRuntime({
    result,
    surface: "slack",
    tool: integrationOfferTool(),
  })

  const output = await runTool({
    call: {
      args: {
        integration: "gmail",
        summary: "Gmail is needed here.",
      },
      id: "call_1",
      name: "offer_integration",
    },
    runtime,
  })

  expect(output.finished).toBe(false)
  expect(runtime.context.activeSurface?.communicated).toBe(communicated)
})

function communicationRuntime(options: {
  result: unknown
  surface?: "github" | "linear" | "slack"
  tool: RuntimeTool
}): AgentRuntime {
  const platform = createPlatform()

  platform.callTool = vi.fn(
    async () => options.result
  ) as typeof platform.callTool

  return createRuntime({
    context: runtimeContext({
      activeSurface: {
        communicated: false,
        surface: options.surface ?? "linear",
        target: null,
      },
      tools: [options.tool],
    }),
    platform,
  })
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
