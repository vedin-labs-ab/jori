import { beforeEach, expect, test, vi } from "vitest"
import { integration } from "../../test/convex/tools"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { prepareIntegrationForRuntime } from "../integrations/runtime"
import { type ApprovalBrokerContext } from "./approval"
import { callBrokerTool, executeApprovedTool } from "./mcp"
import { callProviderTool } from "./tools"

vi.mock("../integrations/runtime", () => ({
  prepareIntegrationForRuntime: vi.fn(async (_ctx, args) => args.integration),
}))
vi.mock("./tools", () => ({
  callProviderTool: vi.fn(async () => ({ ok: true })),
}))

beforeEach(() => vi.clearAllMocks())

const ctx = {} as ActionCtx

test("list_capabilities validates input on its fast path", async () => {
  await expect(
    callBrokerTool(ctx, context(), {
      surface: "jori",
      tool: "list_capabilities",
      args: { unexpected: true },
    })
  ).rejects.toThrow("unexpected is not supported")
})

test.each([
  { name: "ordinary call", execute: callBrokerTool },
  { name: "approved call", execute: executeApprovedTool },
])(
  "$name validates before refreshing provider credentials",
  async ({ execute }) => {
    await expect(
      execute(ctx, context(), {
        surface: "notion",
        tool: "notion_get_page",
        args: { pageId: 42 },
      })
    ).rejects.toThrow("pageId must be a string")
    expect(prepareIntegrationForRuntime).not.toHaveBeenCalled()
    expect(callProviderTool).not.toHaveBeenCalled()
  }
)

test("valid provider input still refreshes credentials and executes", async () => {
  await callBrokerTool(ctx, context(), {
    surface: "notion",
    tool: "notion_get_page",
    args: { pageId: "page" },
  })
  expect(prepareIntegrationForRuntime).toHaveBeenCalledOnce()
  expect(callProviderTool).toHaveBeenCalledWith(
    expect.objectContaining({
      tool: "notion_get_page",
      toolArgs: { pageId: "page" },
    })
  )
})

function context(): ApprovalBrokerContext {
  const notion = integration("notion")
  const run = { _id: "run", organizationId: "organization" } as Doc<"runs">
  return {
    connectedIntegrations: [notion],
    run,
    toolModes: new Map(),
    input: {
      type: "instruction",
      instructions: "Synthetic validation test",
      integrations: [notion],
      run,
      organization: null,
      requester: null,
      timezone: null,
    },
  }
}
