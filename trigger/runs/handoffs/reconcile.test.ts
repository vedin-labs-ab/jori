import { expect, test, vi } from "vitest"
import { type RuntimeTool } from "../../../contracts/runtime/worker"
import { encodeToolResult } from "../../../contracts/transport"
import { runtimeId } from "../../../test/trigger"
import { type ModelMessage } from "../../model/types"
import { type AgentRuntime } from "../../runtime"
import { reconcileHandoffs } from "./reconcile"

test("executes an approved handoff once and injects the result", async () => {
  const runtime = createRuntime({
    approvals: [approvalHandoff("approved")],
  })
  const messages: ModelMessage[] = []

  const result = await reconcileHandoffs(runtime, messages)

  expect(runtime.platform.executeApproval).toHaveBeenCalledTimes(1)
  expect(runtime.platform.executeApproval).toHaveBeenCalledWith({
    approvalId: "approval_1",
    runId: "run_1",
  })
  expect(result).toEqual({
    pending: [],
    progressed: true,
  })
  expect(messages.at(-1)?.content).toContain("notion_create_page")
  expect(messages.at(-1)?.content).toContain("posted")
})

test("surfaces a denied handoff and consumes it without executing", async () => {
  const runtime = createRuntime({
    approvals: [approvalHandoff("denied")],
  })
  const messages: ModelMessage[] = []

  const result = await reconcileHandoffs(runtime, messages)

  expect(runtime.platform.executeApproval).not.toHaveBeenCalled()
  expect(runtime.platform.markApprovalConsumed).toHaveBeenCalledWith({
    approvalId: "approval_1",
  })
  expect(result.progressed).toBe(true)
  expect(messages.at(-1)?.content).toContain("denied")
})

test("surfaces a failed approval delivery without executing", async () => {
  const runtime = createRuntime({
    approvals: [approvalHandoff("failed")],
  })
  const messages: ModelMessage[] = []

  const result = await reconcileHandoffs(runtime, messages)

  expect(runtime.platform.executeApproval).not.toHaveBeenCalled()
  expect(runtime.platform.markApprovalConsumed).toHaveBeenCalledWith({
    approvalId: "approval_1",
  })
  expect(result.progressed).toBe(true)
  expect(messages.at(-1)?.content).toContain(
    "failed before it could be delivered"
  )
})

test("keeps a pending handoff as a wait without progress", async () => {
  const runtime = createRuntime({
    approvals: [approvalHandoff("pending")],
  })
  const messages: ModelMessage[] = []

  const result = await reconcileHandoffs(runtime, messages)

  expect(runtime.platform.executeApproval).not.toHaveBeenCalled()
  expect(result.progressed).toBe(false)
  expect(result.pending).toEqual([
    {
      expiresAt: 1000,
      subject: { id: "approval_1", kind: "approval" },
    },
  ])
})

test("keeps a pending offer as a wait without progress", async () => {
  const runtime = createRuntime({
    offers: [offerHandoff("pending")],
  })
  const messages: ModelMessage[] = []

  const result = await reconcileHandoffs(runtime, messages)

  expect(result.progressed).toBe(false)
  expect(result.pending).toEqual([
    {
      expiresAt: 2000,
      subject: { id: "offer_1", kind: "offer" },
    },
  ])
})

test("refreshes runtime tools when an integration offer connects", async () => {
  const runtime = createRuntime({
    offers: [offerHandoff("connected")],
  })
  const messages: ModelMessage[] = [
    { content: "system", role: "system" },
    { content: "context", role: "user" },
  ]

  const result = await reconcileHandoffs(runtime, messages)

  expect(runtime.platform.reloadContext).toHaveBeenCalledWith({
    runId: "run_1",
  })
  expect(runtime.platform.markOfferConsumed).toHaveBeenCalledWith({
    integrationOfferId: "offer_1",
  })
  expect(runtime.context.tools).toEqual([refreshedTool()])
  expect(messages[0]).toEqual({
    content: "refreshed instructions",
    role: "system",
  })
  expect(messages[1]).toEqual({
    content: "refreshed context",
    role: "user",
  })
  expect(result.progressed).toBe(true)
})

function createRuntime(options: {
  approvals?: ReturnType<typeof approvalHandoff>[]
  offers?: ReturnType<typeof offerHandoff>[]
}): AgentRuntime {
  return {
    platform: {
      executeApproval: vi.fn(async () =>
        encodeToolResult({ status: "posted" })
      ),
      loadRunHandoffs: vi.fn(async () => ({
        approvals: options.approvals ?? [],
        offers: options.offers ?? [],
      })),
      loadRunHandoffSubjects: vi.fn(async () => ({
        approvals: [],
        offers: [],
      })),
      markApprovalConsumed: vi.fn(),
      markOfferConsumed: vi.fn(),
      recordEvent: vi.fn(),
      reloadContext: vi.fn(async () => ({
        prompt: {
          context: "refreshed context",
          instructions: "refreshed instructions",
          organization: null,
          place: null,
          person: null,
          requester: null,
        },
        tools: [refreshedTool()],
        activeSurface: null,
      })),
    } as unknown as AgentRuntime["platform"],
    context: {
      activeSurface: null,
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
      tools: [],
    },
    sandbox: {} as AgentRuntime["sandbox"],
  }
}

function approvalHandoff(status: "approved" | "denied" | "failed" | "pending") {
  return {
    id: runtimeId<"approvals">("approval_1"),
    status,
    surface: "notion" as const,
    tool: "notion_create_page",
    summary: "Create launch notes.",
    code: "ABC123",
    expiresAt: 1000,
  }
}

function offerHandoff(status: "connected" | "pending") {
  return {
    id: runtimeId<"integrationOffers">("offer_1"),
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
