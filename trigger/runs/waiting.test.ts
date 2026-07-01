import { beforeEach, expect, test, vi } from "vitest"
import { type ModelRuntime } from "../model/types"
import { type ToolRuntime } from "../tool"
import { type ConvexId, type RunHandoffs, type RuntimeTool } from "../types"
import { runAgentLoop } from "./loop"
import { type QueuedModelResponse, queuedModelResponses } from "./test-model"

const triggerWait = vi.hoisted(() => ({
  createToken: vi.fn(async () => ({ id: "waitpoint_1" })),
  forToken: vi.fn(),
}))

vi.mock("@trigger.dev/sdk/v3", () => ({
  wait: {
    createToken: triggerWait.createToken,
    forToken: triggerWait.forToken,
  },
}))

beforeEach(() => {
  triggerWait.createToken.mockClear()
  triggerWait.forToken.mockReset()
  triggerWait.forToken.mockResolvedValue({
    ok: true,
    output: { reason: "cancelled" },
  })
})

test("thinks after one handoff resolves before parking on another", async () => {
  const runtime = createRuntime([
    emptyHandoffs(),
    {
      approvals: [approvalHandoff("denied")],
      offers: [offerHandoff("pending")],
    },
    {
      approvals: [],
      offers: [offerHandoff("pending")],
    },
  ])
  const model = createModel([
    {
      content: null,
      toolCalls: [{ args: {}, id: "call_1", name: "finish_run" }],
      type: "tool_calls",
    },
    {
      content: null,
      toolCalls: [{ args: {}, id: "call_2", name: "finish_run" }],
      type: "tool_calls",
    },
  ])

  await expect(runAgentLoop({ attempt: 1, model, runtime })).resolves.toEqual({
    message: "",
    status: "stopped",
  })

  expect(model.complete).toHaveBeenCalledTimes(2)
  expect(model.complete.mock.calls[1]?.[0].messages).toContainEqual(
    expect.objectContaining({
      content: expect.stringContaining("denied"),
      role: "user",
    })
  )
  expect(runtime.convex.markApprovalConsumed).toHaveBeenCalledWith({
    approvalId: "approval_1",
  })
  expect(runtime.convex.createWaiter).toHaveBeenCalledWith({
    expiresAt: 2000,
    runId: "run_1",
    waitpointId: "waitpoint_1",
  })
  expect(triggerWait.createToken).toHaveBeenCalledWith(
    expect.objectContaining({ tags: ["run_1"] })
  )
  expect(triggerWait.forToken).toHaveBeenCalledWith({ id: "waitpoint_1" })
})

function createModel(responses: QueuedModelResponse[]) {
  const queue = queuedModelResponses(responses)

  return {
    complete: vi.fn<ModelRuntime["complete"]>(async () => {
      const response = queue.shift()

      if (response === undefined) {
        throw new Error("No model response queued.")
      }

      return response
    }),
  } satisfies ModelRuntime
}

function createRuntime(handoffs: RunHandoffs[]): ToolRuntime {
  const loadRunHandoffs = vi.fn(async () => {
    return handoffs.shift() ?? emptyHandoffs()
  })

  return {
    convex: {
      callTool: vi.fn(async () => ({ status: "sent" })),
      createWaiter: vi.fn(async () => id<"waiters">("waiter_1")),
      expireWaiter: vi.fn(),
      loadRunHandoffs,
      markApprovalConsumed: vi.fn(),
      markOfferConsumed: vi.fn(),
      recordEvent: vi.fn(),
      sendReply: vi.fn(async () => ({ status: "sent" })),
    },
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
      tools: [finishRunTool()],
    },
    sandbox: {},
  } as unknown as ToolRuntime
}

function emptyHandoffs(): RunHandoffs {
  return { approvals: [], offers: [] }
}

function approvalHandoff(status: "denied") {
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

function offerHandoff(status: "pending") {
  return {
    id: id<"integrationOffers">("offer_1"),
    integration: "notion",
    status,
    summary: null,
    expiresAt: 2000,
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
