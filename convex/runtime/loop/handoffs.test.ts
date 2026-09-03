import { expect, test } from "vitest"
import { type RunHandoffs } from "../../../contracts/runtime/handoffs"
import { createPlatform, type FakePlatform } from "../../../test/platform"
import { createRuntime, runtimeId } from "../../../test/runtime"
import { reconcileHandoffs } from "./handoffs"

test("executes an approved handoff once and injects the result", async () => {
  const { platform, runtime } = handoffRuntime({
    approvals: [approvalHandoff("approved")],
  })

  const result = await reconcileHandoffs(runtime)

  expect(runtime.platform.executeApproval).toHaveBeenCalledTimes(1)
  expect(runtime.platform.executeApproval).toHaveBeenCalledWith({
    approvalId: "approval_1",
    runId: "run_1",
  })
  expect(result).toEqual({ pending: [], progressed: true })
  expect(platform.transcript.at(-1)?.content).toContain("notion_create_page")
  expect(platform.transcript.at(-1)?.content).toContain("posted")
})

test("surfaces a denied handoff and consumes it without executing", async () => {
  const { platform, runtime } = handoffRuntime({
    approvals: [approvalHandoff("denied")],
  })

  const result = await reconcileHandoffs(runtime)

  expect(runtime.platform.executeApproval).not.toHaveBeenCalled()
  expect(runtime.platform.markApprovalConsumed).toHaveBeenCalledWith({
    approvalId: "approval_1",
  })
  expect(result.progressed).toBe(true)
  expect(platform.transcript.at(-1)?.content).toContain("denied")
})

test("surfaces a failed approval delivery without executing", async () => {
  const { platform, runtime } = handoffRuntime({
    approvals: [approvalHandoff("failed")],
  })

  const result = await reconcileHandoffs(runtime)

  expect(runtime.platform.executeApproval).not.toHaveBeenCalled()
  expect(runtime.platform.markApprovalConsumed).toHaveBeenCalledWith({
    approvalId: "approval_1",
  })
  expect(result.progressed).toBe(true)
  expect(platform.transcript.at(-1)?.content).toContain(
    "failed before it could be delivered"
  )
})

test("keeps a pending handoff as a wait without progress", async () => {
  const { runtime } = handoffRuntime({
    approvals: [approvalHandoff("pending")],
  })

  const result = await reconcileHandoffs(runtime)

  expect(runtime.platform.executeApproval).not.toHaveBeenCalled()
  expect(result.progressed).toBe(false)
  expect(result.pending).toEqual([
    { expiresAt: 1000, subject: { id: "approval_1", kind: "approval" } },
  ])
})

test("keeps a pending offer as a wait without progress", async () => {
  const { runtime } = handoffRuntime({ offers: [offerHandoff("pending")] })

  const result = await reconcileHandoffs(runtime)

  expect(result.progressed).toBe(false)
  expect(result.pending).toEqual([
    { expiresAt: 2000, subject: { id: "offer_1", kind: "offer" } },
  ])
})

test("announces a connected integration and consumes its offer", async () => {
  const { platform, runtime } = handoffRuntime({
    offers: [offerHandoff("connected")],
  })

  const result = await reconcileHandoffs(runtime)

  expect(runtime.platform.markOfferConsumed).toHaveBeenCalledWith({
    integrationOfferId: "offer_1",
  })
  expect(platform.transcript.at(-1)).toEqual({
    content: expect.stringContaining("notion is now connected"),
    role: "user",
  })
  expect(result.progressed).toBe(true)
})

function handoffRuntime(handoffs: Partial<RunHandoffs>) {
  const platform = createPlatform({
    handoffs: [
      { approvals: handoffs.approvals ?? [], offers: handoffs.offers ?? [] },
    ],
  }) as FakePlatform
  const runtime = createRuntime({ platform })

  return { platform, runtime }
}

function approvalHandoff(
  status: "approved" | "denied" | "failed" | "pending"
): RunHandoffs["approvals"][number] {
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

function offerHandoff(
  status: "connected" | "pending"
): RunHandoffs["offers"][number] {
  return {
    id: runtimeId<"integrationOffers">("offer_1"),
    integration: "notion",
    status,
    summary: null,
    expiresAt: 2000,
  }
}
