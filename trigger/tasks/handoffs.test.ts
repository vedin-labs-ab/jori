import { expect, test, vi } from "vitest"
import { encodeToolResult } from "../../contracts/tool-transport"
import { type ModelMessage } from "../model/types"
import { type ToolRuntime } from "../tool"
import { type ConvexId, type RuntimeTool } from "../types"
import { reconcileHandoffs } from "./handoffs"

test("executes an approved handoff once and injects the result", async () => {
  const runtime = createRuntime({
    approvals: [approvalHandoff("approved")],
  })
  const messages: ModelMessage[] = []

  const result = await reconcileHandoffs(runtime, messages)

  expect(runtime.convex.executeApproval).toHaveBeenCalledTimes(1)
  expect(runtime.convex.executeApproval).toHaveBeenCalledWith({
    approvalId: "approval_1",
    runId: "run_1",
  })
  expect(result).toEqual({ progressed: true, pending: [] })
  expect(messages.at(-1)?.content).toContain("notion_create_page")
  expect(messages.at(-1)?.content).toContain("posted")
})

test("surfaces a denied handoff and consumes it without executing", async () => {
  const runtime = createRuntime({
    approvals: [approvalHandoff("denied")],
  })
  const messages: ModelMessage[] = []

  const result = await reconcileHandoffs(runtime, messages)

  expect(runtime.convex.executeApproval).not.toHaveBeenCalled()
  expect(runtime.convex.markApprovalConsumed).toHaveBeenCalledWith({
    approvalId: "approval_1",
  })
  expect(result.progressed).toBe(true)
  expect(messages.at(-1)?.content).toContain("denied")
})

test("keeps a pending handoff as a wait without progress", async () => {
  const runtime = createRuntime({
    approvals: [approvalHandoff("pending")],
  })
  const messages: ModelMessage[] = []

  const result = await reconcileHandoffs(runtime, messages)

  expect(runtime.convex.executeApproval).not.toHaveBeenCalled()
  expect(result.progressed).toBe(false)
  expect(result.pending).toEqual([{ expiresAt: 1000 }])
})

test("refreshes runtime tools when an awaited offer connects", async () => {
  const runtime = createRuntime({
    offers: [offerHandoff("connected")],
  })
  const messages: ModelMessage[] = [{ content: "system", role: "system" }]

  const result = await reconcileHandoffs(runtime, messages)

  expect(runtime.convex.reloadContext).toHaveBeenCalledWith({ runId: "run_1" })
  expect(runtime.convex.markOfferConsumed).toHaveBeenCalledWith({
    setupLinkId: "offer_1",
  })
  expect(runtime.context.tools).toEqual([refreshedTool()])
  expect(messages[0]).toEqual({ content: "refreshed", role: "system" })
  expect(result.progressed).toBe(true)
})

function createRuntime(options: {
  approvals?: ReturnType<typeof approvalHandoff>[]
  offers?: ReturnType<typeof offerHandoff>[]
}): ToolRuntime {
  return {
    convex: {
      executeApproval: vi.fn(async () =>
        encodeToolResult({ status: "posted" })
      ),
      loadRunHandoffs: vi.fn(async () => ({
        approvals: options.approvals ?? [],
        offers: options.offers ?? [],
      })),
      markApprovalConsumed: vi.fn(),
      markOfferConsumed: vi.fn(),
      reloadContext: vi.fn(async () => ({
        prompt: "refreshed",
        tools: [refreshedTool()],
        activeSurface: null,
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
      tools: [],
    },
    sandbox: {} as ToolRuntime["sandbox"],
  }
}

function approvalHandoff(status: "approved" | "denied" | "pending") {
  return {
    id: id<"approvals">("approval_1"),
    status,
    surface: "notion" as const,
    tool: "notion_create_page",
    summary: "Create launch notes.",
    code: "ABC123",
    expiresAt: 1000,
  }
}

function offerHandoff(status: "connected") {
  return {
    id: id<"setupLinks">("offer_1"),
    integration: "notion",
    status,
    summary: null,
    expiresAt: 2000,
  }
}

function refreshedTool(): RuntimeTool {
  return {
    access: "write",
    description: "Create a Notion page.",
    inputSchema: {},
    name: "notion_create_page",
    route: "convex",
    surface: "notion",
  }
}

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
