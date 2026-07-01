import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { startMessageRun } from "./data"

test("starts reply runs when a waiter wake never resumed the run", async () => {
  const currentConversation = conversation()
  const ctx = fakeMutationCtx([
    ["conversations", currentConversation],
    session(currentConversation, "stale-run"),
    run("stale-run", "running", 0),
    waiter("stale-run", "woken", 1000),
    trace("stale-run", 500),
  ])

  const result = await startMessageRun(ctx, {
    ...runArgs({ now: 10 * 60 * 1000 }),
    conversation: currentConversation,
  })

  expect(result.status).toBe("started")
  expect(inserted(ctx, "runs")).toEqual([
    expect.objectContaining({
      cause: { type: "message", messageId: "message", kind: "reply" },
    }),
  ])
  expect(ctx.patches).toContainEqual({
    id: "session",
    patch: expect.objectContaining({ runId: "runs-1" }),
  })
})

type StartArgs = Parameters<typeof startMessageRun>[1]

function runArgs(overrides: Partial<StartArgs> = {}): StartArgs {
  return {
    createdBy: "person" as Id<"persons">,
    externalId: "conversation",
    integration: integration(),
    message: message(),
    now: 1000,
    conversation: null,
    ...overrides,
  }
}

function conversation(): Doc<"conversations"> {
  return {
    _creationTime: 0,
    _id: id<"conversations">("conversation"),
    externalId: "conversation",
    integrationId: id<"integrations">("integration"),
    tenantId: "tenant",
    visibility: "public",
  }
}

function integration(): StartArgs["integration"] {
  return {
    _creationTime: 0,
    _id: id<"integrations">("integration"),
    createdAt: 0,
    createdBy: "person" as Id<"persons">,
    credentials: {},
    externalId: "team",
    integration: "slack",
    scope: "tenant",
    status: "active",
    tenantId: "tenant",
    updatedAt: 0,
  }
}

function message(): StartArgs["message"] {
  return {
    _creationTime: 0,
    _id: id<"messages">("message"),
    createdAt: 900,
    externalId: "slack:message",
    integration: "slack",
    integrationId: id<"integrations">("integration"),
    mentioned: false,
    tenantId: "tenant",
    text: "Still there?",
    type: "message.channels",
  }
}

function session(
  currentConversation: Doc<"conversations">,
  runId: string
): Seed {
  return [
    "sessions",
    {
      _creationTime: 0,
      _id: id<"sessions">("session"),
      runId: id<"runs">(runId),
      updatedAt: 0,
      conversationId: currentConversation._id,
    },
  ]
}

function run(
  runId: string,
  status: "completed" | "running",
  createdAt: number
): Seed {
  return [
    "runs",
    {
      _creationTime: 0,
      _id: id<"runs">(runId),
      createdAt,
      status,
      tenantId: "tenant",
    },
  ]
}

function waiter(
  runId: string,
  status: "waiting" | "woken",
  updatedAt: number
): Seed {
  return [
    "waiters",
    {
      _creationTime: updatedAt,
      _id: id<"waiters">("waiter"),
      createdAt: updatedAt,
      expiresAt: updatedAt + 1000,
      runId: id<"runs">(runId),
      status,
      tenantId: "tenant",
      updatedAt,
      waitpointId: "waitpoint",
    },
  ]
}

function trace(runId: string, timestamp: number): Seed {
  return [
    "traces",
    {
      _creationTime: timestamp,
      _id: id<"traces">("trace"),
      key: `trace:${runId}:${timestamp}`,
      runId: id<"runs">(runId),
      tenantId: "tenant",
      timestamp,
      type: "run.started",
    },
  ]
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}

function inserted(ctx: FakeCtx, table: string) {
  return ctx.inserts
    .filter((insert) => insert.table === table)
    .map((insert) => insert.doc)
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
          const query = queryFilter(filters)
          build(query)
          const result = queryResult(rows, table, filters)

          return result
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
  const result = {
    first: async () =>
      [...rows.values()].find(
        (row) => rowTable(row, table) && matches(row, filters)
      ) ?? null,
    order: (_direction: "asc" | "desc") => result,
  }

  return result
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
