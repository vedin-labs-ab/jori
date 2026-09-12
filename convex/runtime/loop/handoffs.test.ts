import { expect, test } from "vitest"
import { type RunHandoffs } from "../../../contracts/runtime/handoffs"
import { createPlatform, type FakePlatform } from "../../../test/platform"
import { createRuntime, runtimeId } from "../../../test/runtime"
import { reconcileHandoffs } from "./handoffs"
import { parkHandoffs } from "./park"
import { hasResolvedHandoffs } from "./pending"

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

test.each([
  ["denied", "denied"],
  ["failed", "failed before it could be delivered"],
] as const)(
  "surfaces a %s handoff and consumes it without executing",
  async (status, message) => {
    const { platform, runtime } = handoffRuntime({
      approvals: [approvalHandoff(status)],
    })

    const result = await reconcileHandoffs(runtime)

    expect(runtime.platform.executeApproval).not.toHaveBeenCalled()
    expect(runtime.platform.markApprovalConsumed).toHaveBeenCalledWith({
      approvalId: "approval_1",
    })
    expect(result.progressed).toBe(true)
    expect(platform.transcript.at(-1)?.content).toContain(message)
  }
)

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

test("an already executing approval parks without claiming, progress or a success note", async () => {
  const approval = {
    ...approvalHandoff("approved"),
    executionPendingUntil: Date.now() + 60_000,
  }
  const { runtime, platform } = handoffRuntime({ approvals: [approval] })
  const result = await reconcileHandoffs(runtime)

  expect(result).toEqual({
    progressed: false,
    pending: [
      {
        expiresAt: approval.executionPendingUntil,
        subject: { kind: "approval", id: approval.id },
      },
    ],
  })
  expect(platform.spies.executeApproval).not.toHaveBeenCalled()
  expect(platform.transcript).toEqual([])
  platform.spies.loadRunHandoffs.mockResolvedValue({
    approvals: [approval],
    offers: [],
  })
  expect(await parkHandoffs(runtime, result.pending)).toEqual({
    parked: { eventId: "event_1" },
  })
  expect(platform.spies.resolveWaiter).not.toHaveBeenCalled()
})

test.each([60_000, 0])(
  "a concurrent claim remains a wait even at its deadline (%s ms)",
  async (remaining) => {
    const { runtime, platform } = handoffRuntime({
      approvals: [approvalHandoff("approved")],
    })
    const expiresAt = Date.now() + remaining
    platform.spies.executeApproval.mockResolvedValue({
      state: "executing",
      expiresAt,
    })

    expect(await reconcileHandoffs(runtime)).toEqual({
      progressed: false,
      pending: [{ expiresAt, subject: { kind: "approval", id: "approval_1" } }],
    })
    expect(platform.transcript).toEqual([])
    expect(platform.spies.markApprovalConsumed).not.toHaveBeenCalled()
  }
)

test("an expired execution wait is resolved so the broker can settle its uncertain result", () => {
  const approval = {
    ...approvalHandoff("approved"),
    executionPendingUntil: Date.now(),
  }
  expect(hasResolvedHandoffs({ approvals: [approval], offers: [] })).toBe(true)
})

test("a terminal execution error is delivered without saying the action ran successfully", async () => {
  const { runtime, platform } = handoffRuntime({
    approvals: [approvalHandoff("approved")],
  })
  platform.spies.executeApproval.mockResolvedValue({
    state: "done",
    result: JSON.stringify({
      status: "error",
      error: { message: "Tool is blocked: read_file" },
    }),
  })

  expect(await reconcileHandoffs(runtime)).toEqual({
    progressed: true,
    pending: [],
  })
  expect(platform.transcript.at(-1)?.content).toContain(
    "Tool is blocked: read_file"
  )
  expect(platform.transcript.at(-1)?.content).not.toContain(" ran.")
  expect(platform.spies.markApprovalConsumed).toHaveBeenCalledTimes(1)
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
