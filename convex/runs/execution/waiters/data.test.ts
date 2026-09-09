import { createEvent, type EventId, sendEvent } from "@convex-dev/workflow"
import { beforeEach, expect, test, vi } from "vitest"
import { databaseContext, id } from "../../../../test/convex/database"
import {
  expireWaiter,
  parkRun,
  wakeParentForTerminalRun,
  wakeRun,
} from "./data"

vi.mock("@convex-dev/workflow", () => ({
  createEvent: vi.fn(),
  sendEvent: vi.fn(),
}))

const eventId = "event-1" as EventId<"wake">

beforeEach(() => {
  vi.mocked(createEvent).mockReset().mockResolvedValue(eventId)
  vi.mocked(sendEvent).mockReset().mockResolvedValue(eventId)
})

test("parking creates the wake event and schedules its expiry", async () => {
  const { ctx, database, runAt } = waiterContext()
  const runId = await database.insert("runs", {
    organizationId: "organization",
    status: "running",
    workflowId: "workflow-1",
  })

  const parked = await parkRun(ctx, { runId, expiresAt: 5000 })

  expect(parked.eventId).toBe("event-1")
  expect(createEvent).toHaveBeenCalledExactlyOnceWith(ctx, expect.anything(), {
    name: "wake",
    workflowId: "workflow-1",
  })
  expect(await database.get(parked.waiterId)).toMatchObject({
    eventId: "event-1",
    expiresAt: 5000,
    functionId: "scheduled-1",
    status: "waiting",
  })
  expect(runAt).toHaveBeenCalledExactlyOnceWith(5000, expect.anything(), {
    waiterId: parked.waiterId,
  })
})

test("parking a run without a workflow is refused", async () => {
  const { ctx, database } = waiterContext()
  const runId = await database.insert("runs", {
    organizationId: "organization",
    status: "running",
  })

  await expect(parkRun(ctx, { runId, expiresAt: 5000 })).rejects.toThrow(
    "Run has no workflow to park."
  )
})

test("wakes waiters with resolved offer subjects", async () => {
  const { ctx, database, cancel } = waiterContext()
  const waiterId = await database.insert("waiters", waiter())
  const subject = {
    id: id<"integrationOffers">("offer"),
    kind: "offer" as const,
  }

  await expect(
    wakeRun(ctx, {
      reason: "resolved",
      runId: id<"runs">("run"),
      subject,
    })
  ).resolves.toBe(true)

  expect(await database.get(waiterId)).toMatchObject({
    reason: "resolved",
    status: "woken",
    subject,
  })
  expect(cancel).toHaveBeenCalledExactlyOnceWith("function")
  expect(sendEvent).toHaveBeenCalledExactlyOnceWith(
    ctx,
    expect.anything(),
    expect.objectContaining({
      id: "event-1",
      value: { reason: "resolved", subject, waiter: waiterId },
    })
  )
})

test("expiring an already woken waiter sends nothing", async () => {
  const { ctx, database, cancel } = waiterContext()
  const woken = waiter({ status: "woken" })
  const waiterId = await database.insert("waiters", woken)

  await expect(expireWaiter(ctx, waiterId)).resolves.toBeNull()

  expect(await database.get(waiterId)).toEqual(woken)
  expect(sendEvent).not.toHaveBeenCalled()
  expect(cancel).not.toHaveBeenCalled()
})

test("wakes a parent only after every named child is terminal", async () => {
  const { ctx, database } = waiterContext()
  const firstChild = await database.insert("runs", {
    parentId: id<"runs">("run-parent"),
    organizationId: "organization",
    status: "completed",
  })
  const secondChild = await database.insert("runs", {
    parentId: id<"runs">("run-parent"),
    organizationId: "organization",
    status: "running",
  })
  const waiterId = await database.insert(
    "waiters",
    waiter({
      condition: { kind: "runs", runIds: [firstChild, secondChild] },
      runId: id<"runs">("run-parent"),
    })
  )

  await expect(wakeParentForTerminalRun(ctx, firstChild)).resolves.toBe(false)

  await database.patch(secondChild, { status: "failed" })

  await expect(wakeParentForTerminalRun(ctx, secondChild)).resolves.toBe(true)
  expect(await database.get(waiterId)).toMatchObject({ status: "woken" })
})

function waiter(overrides: Record<string, unknown> = {}) {
  return {
    _creationTime: 0,
    _id: id<"waiters">("waiter"),
    createdAt: 0,
    eventId: "event-1",
    expiresAt: 1000,
    functionId: "function",
    runId: id<"runs">("run"),
    status: "waiting",
    organizationId: "organization",
    updatedAt: 0,
    ...overrides,
  }
}

function waiterContext() {
  const cancel = vi.fn()
  const runAt = vi.fn().mockResolvedValue("scheduled-1")

  return {
    ...databaseContext({ scheduler: { cancel, runAt } }),
    cancel,
    runAt,
  }
}
