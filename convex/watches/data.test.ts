import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { startMessageRun } from "./data"

test("starts new watch message runs as mentions", async () => {
  const ctx = fakeMutationCtx()
  const result = await startMessageRun(ctx, runArgs())

  expect(result.status).toBe("started")
  expect(inserted(ctx, "runs")).toEqual([
    expect.objectContaining({
      cause: { type: "message", messageId: "message", kind: "mention" },
    }),
  ])
  expect(inserted(ctx, "watches")).toEqual([
    expect.objectContaining({
      externalId: "conversation",
    }),
  ])
  expect(inserted(ctx, "sessions")).toEqual([
    expect.objectContaining({
      watchId: "watches-2",
      cursor: {
        messageId: "message",
        timestamp: 0,
      },
      reactionCursor: {
        updatedAt: 1000,
      },
      runId: "runs-1",
    }),
  ])
  expect(inserted(ctx, "outbox")).toEqual([
    expect.objectContaining({
      key: "run:runs-1",
      operation: expect.objectContaining({
        runId: "runs-1",
        type: "run.start",
      }),
      status: "pending",
    }),
  ])
})

test("continues active watch sessions without starting another run", async () => {
  const watch = watchDoc()
  const ctx = fakeMutationCtx([
    ["watches", watch],
    ...activeSessionSeed(watch, "active-run", "running"),
  ])

  const result = await startMessageRun(ctx, {
    ...runArgs({ message: message("Steer this.") }),
    watch,
  })

  expect(result).toMatchObject({
    runId: "active-run",
    status: "continued",
    sessionId: "session",
  })
  expect(ctx.inserts).toEqual([])
})

test("starts reply runs when the previous session is terminal", async () => {
  const watch = watchDoc()
  const ctx = fakeMutationCtx([
    ["watches", watch],
    ...activeSessionSeed(watch, "old-run", "completed"),
  ])

  const result = await startMessageRun(ctx, {
    ...runArgs({ message: message("Following up.") }),
    watch,
  })

  expect(result.status).toBe("started")
  expect(inserted(ctx, "runs")).toEqual([
    expect.objectContaining({
      cause: { type: "message", messageId: "message", kind: "reply" },
    }),
  ])
  expect(ctx.patches).toContainEqual({
    id: "session",
    patch: expect.objectContaining({
      reactionCursor: {
        updatedAt: 1000,
      },
      runId: "runs-1",
    }),
  })
})

test("starts existing watches without sessions as mentions", async () => {
  const watch = watchDoc()
  const ctx = fakeMutationCtx([["watches", watch]])

  const result = await startMessageRun(ctx, {
    ...runArgs({ message: message("First routed task.") }),
    watch,
  })

  expect(result.status).toBe("started")
  expect(inserted(ctx, "runs")).toEqual([
    expect.objectContaining({
      cause: { type: "message", messageId: "message", kind: "mention" },
    }),
  ])
})

function watchDoc(): Doc<"watches"> {
  return {
    _id: id<"watches">("watch-doc"),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    externalId: "conversation",
  }
}

type StartArgs = Parameters<typeof startMessageRun>[1]

function runArgs(overrides: Partial<StartArgs> = {}): StartArgs {
  return {
    watch: null,
    integration: integration(),
    message: message("Please help."),
    createdBy: "user",
    externalId: "conversation",
    now: 1000,
    ...overrides,
  }
}

function integration() {
  return {
    _id: id<"integrations">("integration"),
    _creationTime: 0,
    tenantId: "tenant",
    integration: "slack",
    scope: "tenant",
    externalId: "team",
    credentials: {},
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Parameters<typeof startMessageRun>[1]["integration"]
}

function message(text: string, data?: unknown) {
  return {
    _id: id<"messages">("message"),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    integration: "slack",
    type: "message.channels",
    externalId: "slack:message",
    mentioned: false,
    text,
    data,
    createdAt: 900,
  } as Parameters<typeof startMessageRun>[1]["message"]
}

function activeSessionSeed(
  watch: Doc<"watches">,
  runId: string,
  status: "completed" | "running"
): Seed[] {
  return [
    [
      "sessions",
      {
        _id: id<"sessions">("session"),
        _creationTime: 0,
        watchId: watch._id,
        runId: id<"runs">(runId),
        updatedAt: 0,
      },
    ],
    [
      "runs",
      {
        _id: id<"runs">(runId),
        _creationTime: 0,
        tenantId: "tenant",
        status,
        createdAt: 0,
      },
    ],
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

function fakeMutationCtx(seed: Seed[] = []): FakeCtx {
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
        const row = { _id: rowId, _creationTime: 0, ...doc }

        inserts.push({ table, doc })
        rows.set(rowId, row)

        return rowId
      },
      patch: async (rowId: string, patch: Record<string, unknown>) => {
        patches.push({ id: rowId, patch })
        rows.set(rowId, { ...rows.get(rowId), ...patch })
      },
      query: (table: string) => ({
        withIndex: (_index: string, build: (query: QueryFilter) => unknown) => {
          const filters: [string, unknown][] = []
          const query = {
            eq: (field: string, value: unknown) => {
              filters.push([field, value])
              return query
            },
          }

          build(query)

          const result = {
            first: async () =>
              [...rows.values()].find(
                (row) => rowTable(row, table) && matches(row, filters)
              ) ?? null,
            order: (_direction: "asc" | "desc") => result,
          }

          return result
        },
      }),
    },
    scheduler: {
      runAfter: async () => "scheduled",
    },
  } as unknown as FakeCtx
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
