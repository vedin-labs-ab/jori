import { expect, test } from "vitest"
import { id } from "../../../../test/convex/database"
import { type MutationCtx } from "../../../_generated/server"
import {
  claimReusableSandbox,
  releaseIdleSandbox,
  reserveExpiredSandboxCleanup,
  upsertSandbox,
} from "./data"

test("releases and claims idle sandboxes by conversation", async () => {
  const ctx = fakeMutationCtx([
    ["runs", run("run-1", "running")],
    ["sessions", session("session-1", "run-1", "conversation-1")],
  ])

  await upsertSandbox(ctx, {
    externalId: "sandbox-external",
    runId: id<"runs">("run-1"),
  })

  expect(row(ctx, "sandbox-1")).toMatchObject({
    externalId: "sandbox-external",
    runId: "run-1",
    status: "active",
    conversationId: "conversation-1",
  })

  const lease = await releaseIdleSandbox(ctx, {
    externalId: "sandbox-external",
    runId: id<"runs">("run-1"),
  })

  expect(lease?.expiresAt).toBeGreaterThan(Date.now())
  expect(row(ctx, "sandbox-1")).toMatchObject({
    status: "idle",
    conversationId: "conversation-1",
  })

  ctx.rows.set("run-2", run("run-2", "running"))
  ctx.rows.set("session-2", session("session-2", "run-2", "conversation-1"))

  await expect(claimReusableSandbox(ctx, id<"runs">("run-2"))).resolves.toEqual(
    { externalId: "sandbox-external" }
  )
  expect(row(ctx, "sandbox-1")).toMatchObject({
    runId: "run-2",
    status: "active",
  })
  expect(row(ctx, "sandbox-1")).not.toHaveProperty("expiresAt")
})

test("expired cleanup only reserves matching idle leases", async () => {
  const expiresAt = Date.now() - 1
  const ctx = fakeMutationCtx([
    [
      "sandboxes",
      sandbox({
        expiresAt,
        runId: "run-1",
        status: "idle",
      }),
    ],
  ])

  await expect(
    reserveExpiredSandboxCleanup(ctx, {
      expiresAt: expiresAt + 1,
      externalId: "sandbox-external",
      runId: id<"runs">("run-1"),
    })
  ).resolves.toBe(false)
  expect(row(ctx, "sandbox-1")).toMatchObject({ status: "idle" })

  await expect(
    reserveExpiredSandboxCleanup(ctx, {
      expiresAt,
      externalId: "sandbox-external",
      runId: id<"runs">("run-1"),
    })
  ).resolves.toBe(true)
  expect(row(ctx, "sandbox-1")).toMatchObject({ status: "cleaned" })
  expect(row(ctx, "sandbox-1")).not.toHaveProperty("expiresAt")
})

type Seed = [string, Record<string, unknown>]

type FakeCtx = MutationCtx & {
  rows: Map<string, Record<string, unknown>>
}

function fakeMutationCtx(seed: Seed[] = []): FakeCtx {
  const rows = new Map(seed.map(([, doc]) => [String(doc._id), doc]))

  return {
    rows,
    db: {
      get: async (rowId: string) => rows.get(rowId) ?? null,
      insert: async (table: string, doc: Record<string, unknown>) => {
        const rowId = `${tableIdPrefix(table)}-${tableRows(rows, table) + 1}`
        rows.set(rowId, { _id: rowId, _creationTime: 0, ...doc })

        return rowId
      },
      patch: async (rowId: string, patch: Record<string, unknown>) => {
        const next = { ...rows.get(rowId), ...patch }

        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined) {
            delete next[key]
          }
        }

        rows.set(rowId, next)
      },
      query: (table: string) => ({
        withIndex: (_index: string, build: (query: QueryFilter) => unknown) => {
          const filters: Filter[] = []
          const query = queryFilter(filters)

          build(query)

          return queryResult(rows, table, filters)
        },
      }),
    },
  } as unknown as FakeCtx
}

function queryFilter(filters: Filter[]): QueryFilter {
  const query = {
    eq: (field: string, value: unknown) => {
      filters.push({ field, op: "eq", value })
      return query
    },
    gt: (field: string, value: unknown) => {
      filters.push({ field, op: "gt", value })
      return query
    },
  }

  return query
}

function queryResult(
  rows: Map<string, Record<string, unknown>>,
  table: string,
  filters: Filter[]
) {
  return {
    order: (_direction: "asc" | "desc") => queryResult(rows, table, filters),
    first: async () =>
      [...rows.values()].find(
        (candidate) => rowTable(candidate, table) && matches(candidate, filters)
      ) ?? null,
  }
}

function row(ctx: FakeCtx, rowId: string) {
  return ctx.rows.get(rowId)
}

function run(idValue: string, status: "completed" | "running") {
  return {
    _id: id<"runs">(idValue),
    _creationTime: 0,
    organizationId: "organization",
    status,
  }
}

function session(idValue: string, runId: string, conversationId: string) {
  return {
    _id: id<"sessions">(idValue),
    _creationTime: 0,
    runId: id<"runs">(runId),
    updatedAt: 0,
    conversationId: id<"conversations">(conversationId),
  }
}

function sandbox(overrides: Record<string, unknown>) {
  return {
    _id: id<"sandboxes">("sandbox-1"),
    _creationTime: 0,
    organizationId: "organization",
    externalId: "sandbox-external",
    createdAt: 0,
    updatedAt: 0,
    conversationId: id<"conversations">("conversation-1"),
    ...overrides,
  }
}

function rowTable(row: Record<string, unknown>, table: string) {
  return typeof row._id === "string" && row._id.startsWith(tableIdPrefix(table))
}

function tableRows(rows: Map<string, Record<string, unknown>>, table: string) {
  return [...rows.values()].filter((candidate) => rowTable(candidate, table))
    .length
}

function tableIdPrefix(table: string) {
  if (table.endsWith("es")) {
    return table.slice(0, -2)
  }

  return table.endsWith("s") ? table.slice(0, -1) : table
}

type Filter = {
  field: string
  op: "eq" | "gt"
  value: unknown
}

type QueryFilter = {
  eq: (field: string, value: unknown) => QueryFilter
  gt: (field: string, value: unknown) => QueryFilter
}

function matches(row: Record<string, unknown>, filters: Filter[]) {
  return filters.every((filter) => {
    if (filter.op === "gt") {
      return Number(row[filter.field]) > Number(filter.value)
    }

    return row[filter.field] === filter.value
  })
}
