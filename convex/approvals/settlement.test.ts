// @vitest-environment edge-runtime
import { sendEvent } from "@convex-dev/workflow"
import { afterEach, expect, test, vi } from "vitest"
import { approvalExecutionTimeoutMs } from "../../contracts/runtime/handoffs"
import { approvalFixture } from "../../test/approvals"
import { internal } from "../_generated/api"

vi.mock("@convex-dev/workflow", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@convex-dev/workflow")>()),
  sendEvent: vi.fn(),
}))
afterEach(() => vi.mocked(sendEvent).mockReset())

test("handoffs distinguish running and persisted execution; delivery is atomic and idempotent", async () => {
  const { t, args } = await approvalFixture()
  await t.mutation(internal.approvals.execution.claim, args)
  const load = () =>
    t.query(internal.runs.execution.waiters.handoffs.load, {
      runId: args.runId,
    })
  expect((await load()).approvals[0]?.executionPendingUntil).toBeGreaterThan(
    Date.now() + approvalExecutionTimeoutMs - 1000
  )
  await t.mutation(internal.approvals.execution.record, {
    ...args,
    result: JSON.stringify({ status: "read" }),
  })
  expect((await load()).approvals[0]?.executionPendingUntil).toBeUndefined()
  const consume = {
    approvalId: args.approvalId,
    message: {
      role: "user" as const,
      content: "Approved action returned its result.",
    },
  }
  await t.mutation(
    internal.runs.execution.waiters.handoffs.consumeApproval,
    consume
  )
  await t.mutation(
    internal.runs.execution.waiters.handoffs.consumeApproval,
    consume
  )
  expect((await load()).approvals).toEqual([])
  expect(
    await t.query(internal.runs.execution.transcript.records.list, {
      runId: args.runId,
    })
  ).toEqual([consume.message])
})

test("persisting a result wakes the execution waiter once", async () => {
  const { t, args } = await approvalFixture()
  await t.mutation(internal.approvals.execution.claim, args)
  const waiterId = await t.run(
    async (ctx) =>
      await ctx.db.insert("waiters", {
        organizationId: "verification",
        runId: args.runId,
        eventId: "execution-event",
        status: "waiting",
        expiresAt: Date.now() + 60_000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
  )
  const result = JSON.stringify({
    status: "error",
    error: { message: "Blocked" },
  })
  await t.mutation(internal.approvals.execution.record, { ...args, result })
  await t.mutation(internal.approvals.execution.record, { ...args, result })
  expect(await t.run(async (ctx) => await ctx.db.get(waiterId))).toMatchObject({
    status: "woken",
    reason: "resolved",
  })
  expect(sendEvent).toHaveBeenCalledTimes(1)
  expect(vi.mocked(sendEvent).mock.calls[0]?.[2]).toMatchObject({
    id: "execution-event",
    value: {
      reason: "resolved",
      subject: { kind: "approval", id: args.approvalId },
    },
  })
})

test("a failed workflow wake rolls back result persistence without releasing the claim", async () => {
  const { t, args } = await approvalFixture()
  await t.mutation(internal.approvals.execution.claim, args)
  const waiterId = await t.run(
    async (ctx) =>
      await ctx.db.insert("waiters", {
        organizationId: "verification",
        runId: args.runId,
        eventId: "execution-event",
        status: "waiting",
        expiresAt: Date.now() + 60_000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
  )
  vi.mocked(sendEvent).mockRejectedValueOnce(
    new Error("Workflow persistence failed")
  )
  await expect(
    t.mutation(internal.approvals.execution.record, {
      ...args,
      result: "result",
    })
  ).rejects.toThrow("Workflow persistence failed")
  expect(
    (await t.run(async (ctx) => await ctx.db.get(args.approvalId)))?.result
  ).toBeUndefined()
  expect((await t.run(async (ctx) => await ctx.db.get(waiterId)))?.status).toBe(
    "waiting"
  )
  expect(
    await t.mutation(internal.approvals.execution.claim, args)
  ).toMatchObject({ state: "executing" })
})
