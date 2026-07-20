import { expect, test } from "vitest"
import { type DataModel, type Id } from "../../../_generated/dataModel"
import { type MutationCtx } from "../../../_generated/server"
import { wakeParentForTerminalRun, wakeRun } from "./data"

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
  expect(ctx.inserts).toEqual([
    {
      table: "outbox",
      doc: expect.objectContaining({
        key: "waiter:waiter:wake",
        operation: {
          reason: "resolved",
          subject,
          type: "waiter.wake",
          waiterId: "waiter",
        },
      }),
    },
  ])
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
    run("run-child-1", "completed"),
    run("run-child-2", "running"),
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
      expiresAt: 1000,
      runId: id<"runs">("run"),
      status: "waiting",
      organizationId: "organization",
      updatedAt: 0,
      waitpointId: "waitpoint",
      ...overrides,
    },
  ]
}

function run(runId: string, status: "completed" | "failed" | "running"): Seed {
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

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}

type Seed = [string, Record<string, unknown>]
type FakeCtx = MutationCtx & {
  inserts: Array<{ table: string; doc: unknown }>
  patches: Array<{ id: string; patch: unknown }>
}

function fakeMutationCtx(seed: Seed[]): FakeCtx {
  const inserts: Array<{ table: string; doc: unknown }> = []
  const patches: Array<{ id: string; patch: unknown }> = []
  const rows = new Map(seed.map(([, doc]) => [String(doc._id), doc]))

  return {
    inserts,
    patches,
    db: {
      get: async (rowId: string) => rows.get(rowId) ?? null,
      insert: async (table: string, doc: Record<string, unknown>) => {
        const rowId = `${table}-${inserts.length + 1}`
        rows.set(rowId, { _creationTime: 0, _id: rowId, ...doc })
        inserts.push({ table, doc })
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
    scheduler: { runAfter: async () => "scheduled" },
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
  return {
    first: async () =>
      [...rows.values()].find(
        (row) => rowTable(row, table) && matches(row, filters)
      ) ?? null,
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
