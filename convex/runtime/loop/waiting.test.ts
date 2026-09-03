import { expect, test } from "vitest"
import { type RuntimeTool } from "../../../contracts/runtime/context"
import { type RunHandoffs } from "../../../contracts/runtime/handoffs"
import { createPlatform } from "../../../test/platform"
import {
  createQueuedModel,
  createRuntime,
  runLoop,
  runtimeContext,
  runtimeId,
} from "../../../test/runtime"

test("thinks after one handoff resolves before parking on another", async () => {
  const platform = createPlatform({
    handoffs: [
      {
        approvals: [approvalHandoff("denied")],
        offers: [offerHandoff()],
      },
      { approvals: [], offers: [offerHandoff()] },
    ],
  })
  const runtime = createRuntime({
    context: runtimeContext({ tools: [finishRunTool()] }),
    platform,
  })
  const model = createQueuedModel([
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

  await expect(
    runLoop({
      model,
      runtime,
      wakes: [
        { reason: "cancelled", waiter: runtimeId<"waiters">("waiter_1") },
      ],
    })
  ).resolves.toBe("stopped")

  expect(model.complete).toHaveBeenCalledTimes(2)
  expect(model.complete.mock.calls[1]?.[0].messages).toContainEqual(
    expect.objectContaining({
      content: expect.stringContaining("denied"),
      role: "user",
    })
  )
  expect(runtime.platform.markApprovalConsumed).toHaveBeenCalledWith({
    approvalId: "approval_1",
  })
  expect(runtime.platform.park).toHaveBeenCalledWith({ expiresAt: 2000 })
})

function approvalHandoff(status: "denied"): RunHandoffs["approvals"][number] {
  return {
    id: runtimeId<"approvals">("approval_1"),
    status,
    surface: "notion",
    tool: "notion_create_page",
    summary: "Create launch notes.",
    code: "ABC123",
    expiresAt: 1000,
  }
}

function offerHandoff(): RunHandoffs["offers"][number] {
  return {
    id: runtimeId<"integrationOffers">("offer_1"),
    integration: "notion",
    status: "pending",
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
