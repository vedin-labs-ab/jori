import { createEvent, type EventId, sendEvent } from "@convex-dev/workflow"
import { beforeEach, expect, test, vi } from "vitest"
import { id } from "../../../../test/convex/database"
import { type MutationCtx } from "../../../_generated/server"
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
  const ctx = fakeMutationCtx([run("run", "running", "workflow-1")])

  await expect(
    parkRun(ctx, { runId: id<"runs">("run"), expiresAt: 5000 })
  ).resolves.toEqual({ waiterId: "waiters-1", eventId: "event-1" })

  expect(vi.mocked(createEvent).mock.calls[0]?.[2]).toEqual({
    name: "wake",
    workflowId: "workflow-1",
  })
  expect(ctx.rows.get("waiters-1")).toMatchObject({
    eventId: "event-1",
    expiresAt: 5000,
    functionId: "scheduled-1",
    status: "waiting",
  })
  expect(ctx.scheduled).toEqual([{ at: 5000, args: { waiterId: "waiters-1" } }])
})

test("parking a run without a workflow is refused", async () => {
  const ctx = fakeMutationCtx([run("run", "running")])

  await expect(
    parkRun(ctx, { runId: id<"runs">("run"), expiresAt: 5000 })
  ).rejects.toThrow("Run has no workflow to park.")
})

test("wakes waiters with resolved offer subjects", async () => {
  const ctx = fakeMutationCtx([waiter()])
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

  expect(ctx.patches).toEqual([
    {
      id: "waiter",
      patch: expect.objectContaining({
        reason: "resolved",
        status: "woken",
        subject,
      }),
    },
  ])
  expect(ctx.cancelled).toEqual(["function"])
  expect(vi.mocked(sendEvent).mock.calls[0]?.[2]).toMatchObject({
    id: "event-1",
    value: { reason: "resolved", subject, waiter: "waiter" },
  })
})

test("expiring an already woken waiter sends nothing", async () => {
  const ctx = fakeMutationCtx([waiter({ status: "woken" })])

  await expect(expireWaiter(ctx, id<"waiters">("waiter"))).resolves.toBeNull()

  expect(ctx.patches).toEqual([])
  expect(sendEvent).not.toHaveBeenCalled()
})

test("wakes a parent only after every named child is terminal", async () => {
  const ctx = fakeMutationCtx([
    waiter({
      condition: {
        kind: "runs",
        runIds: [id<"runs">("run-child-1"), id<"runs">("run-child-2")],
      },
      runId: id<"runs">("run-parent"),
    }),
    childRun("run-child-1", "completed"),
    childRun("run-child-2", "running"),
  ])

  await expect(
    wakeParentForTerminalRun(ctx, id<"runs">("run-child-1"))
  ).resolves.toBe(false)

  await ctx.db.patch(id<"runs">("run-child-2"), { status: "failed" })

  await expect(
    wakeParentForTerminalRun(ctx, id<"runs">("run-child-2"))
  ).resolves.toBe(true)
  expect(ctx.patches).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "waiter",
        patch: expect.objectContaining({ status: "woken" }),
      }),
    ])
  )
})

function waiter(overrides: Record<string, unknown> = {}): Seed {
  return [
    "waiters",
    {
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
    },
  ]
}

function run(runId: string, status: string, workflowId?: string): Seed {
  return [
    "runs",
    {
      _creationTime: 0,
      _id: id<"runs">(runId),
      status,
      organizationId: "organization",
      ...(workflowId === undefined ? {} : { workflowId }),
    },
  ]
}

function childRun(
  runId: string,
  status: "completed" | "failed" | "running"
): Seed {
  return [
    "runs",
    {
      _creationTime: 0,
      _id: id<"runs">(runId),
      parentId: id<"runs">("run-parent"),
      status,
      organizationId: "organization",
    },
  ]
}

type Seed = [string, Record<string, unknown>]
type FakeCtx = MutationCtx & {
  cancelled: string[]
  patches: Array<{ id: string; patch: unknown }>
  rows: Map<string, Record<string, unknown>>
  scheduled: Array<{ at: number; args: unknown }>
}

function fakeMutationCtx(seed: Seed[]): FakeCtx {
  const cancelled: string[] = []
  const patches: Array<{ id: string; patch: unknown }> = []
  const scheduled: Array<{ at: number; args: unknown }> = []
  const rows = new Map(seed.map(([, doc]) => [String(doc._id), doc]))
  let inserts = 0

  return {
    cancelled,
    patches,
    rows,
    scheduled,
    db: {
      get: async (rowId: string) => rows.get(rowId) ?? null,
      insert: async (table: string, doc: Record<string, unknown>) => {
        inserts += 1
        const rowId = `${table}-${inserts}`
        rows.set(rowId, { _creationTime: 0, _id: rowId, ...doc })

        return rowId
      },
      patch: async (rowId: string, patch: Record<string, unknown>) => {
        rows.set(rowId, { ...rows.get(rowId), ...patch })
        patches.push({ id: rowId, patch })
      },
      query: (table: string) => ({
        withIndex: (_index: string, build: (query: QueryFilter) => unknown) => {
          const filters: [string, unknown][] = []

          build(queryFilter(filters))

          return queryResult(rows, table, filters)
        },
      }),
    },
    scheduler: {
      cancel: async (functionId: string) => {
        cancelled.push(functionId)
      },
      runAt: async (at: number, _reference: unknown, args: unknown) => {
        scheduled.push({ at, args })

        return `scheduled-${scheduled.length}`
      },
    },
  } as unknown as FakeCtx
}

function queryFilter(filters: [string, unknown][]): QueryFilter {
  return {
    eq: (field, value) => {
      filters.push([field, value])
      return queryFilter(filters)
    },
  }
}

function queryResult(
  rows: Map<string, Record<string, unknown>>,
  table: string,
  filters: [string, unknown][]
) {
  const matching = () =>
    [...rows.values()].filter(
      (row) => rowTable(row, table) && matches(row, filters)
    )

  return {
    first: async () => matching()[0] ?? null,
    [Symbol.asyncIterator]: async function* () {
      yield* matching()
    },
  }
}

function rowTable(row: Record<string, unknown>, table: string) {
  return typeof row._id === "string" && row._id.startsWith(tableIdPrefix(table))
}

function tableIdPrefix(table: string) {
  return table.endsWith("s") ? table.slice(0, -1) : table
}

type QueryFilter = {
  eq: (field: string, value: unknown) => QueryFilter
}

function matches(row: Record<string, unknown>, filters: [string, unknown][]) {
  return filters.every(([field, value]) => row[field] === value)
}
