import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { startMessageRun } from "./data"

test("starts new conversation message runs as mentions", async () => {
  const ctx = fakeMutationCtx()
  const result = await startMessageRun(ctx, {
    conversation: null,
    integration: integration(),
    message: message("Please help."),
    conversationKey: "conversation",
    createdBy: "user",
    now: 1000,
  })

  expect(result.status).toBe("started")
  expect(inserted(ctx, "runs")).toEqual([
    expect.objectContaining({
      reason: { type: "message", messageId: "message", kind: "mention" },
    }),
  ])
  expect(inserted(ctx, "conversations")).toEqual([
    expect.objectContaining({
      conversationId: "conversation",
      rootRunId: "runs-1",
    }),
  ])
  expect(inserted(ctx, "sessions")).toEqual([
    expect.objectContaining({
      conversationId: "conversations-2",
      lastConsumedMessageId: "message",
      runId: "runs-1",
      state: "active",
    }),
  ])
  expect(ctx.patches).toContainEqual({
    id: "sessions-3",
    patch: expect.objectContaining({
      executionId: "executions-4",
    }),
  })
  expect(inserted(ctx, "outbox")).toHaveLength(1)
})

test("continues active conversation sessions without starting another run", async () => {
  const conversation = conversationDoc()
  const ctx = fakeMutationCtx([
    ["conversations", conversation],
    ...activeSessionSeed(conversation, "active-run", "running"),
  ])

  const result = await startMessageRun(ctx, {
    conversation,
    integration: integration(),
    message: message("Steer this."),
    conversationKey: "conversation",
    createdBy: "user",
    now: 1000,
  })

  expect(result).toMatchObject({
    runId: "active-run",
    status: "continued",
    sessionId: "session",
  })
  expect(ctx.inserts).toEqual([])
})

test("starts reply runs when the previous session is terminal", async () => {
  const conversation = conversationDoc()
  const ctx = fakeMutationCtx([
    ["conversations", conversation],
    ...activeSessionSeed(conversation, "old-run", "completed"),
  ])

  const result = await startMessageRun(ctx, {
    conversation,
    integration: integration(),
    message: message("Following up."),
    conversationKey: "conversation",
    createdBy: "user",
    now: 1000,
  })

  expect(result.status).toBe("started")
  expect(inserted(ctx, "runs")).toEqual([
    expect.objectContaining({
      reason: { type: "message", messageId: "message", kind: "reply" },
    }),
  ])
  expect(ctx.patches).toContainEqual({
    id: "session",
    patch: expect.objectContaining({
      runId: "runs-1",
      state: "active",
    }),
  })
  expect(ctx.patches).toContainEqual({
    id: "session",
    patch: expect.objectContaining({
      executionId: "executions-2",
    }),
  })
})

function conversationDoc(): Doc<"conversations"> {
  return {
    _id: id<"conversations">("conversation-doc"),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    conversationId: "conversation",
    rootRunId: id<"runs">("root-run"),
    createdAt: 0,
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
    text,
    data,
    metadata: [],
    createdAt: 900,
  } as Parameters<typeof startMessageRun>[1]["message"]
}

function activeSessionSeed(
  conversation: Doc<"conversations">,
  runId: string,
  status: "completed" | "running"
): Seed[] {
  return [
    [
      "sessions",
      {
        _id: id<"sessions">("session"),
        _creationTime: 0,
        tenantId: "tenant",
        conversationId: conversation._id,
        state: "active",
        runId: id<"runs">(runId),
        executionId: id<"executions">("execution"),
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    [
      "executions",
      {
        _id: id<"executions">("execution"),
        _creationTime: 0,
        tenantId: "tenant",
        runId: id<"runs">(runId),
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
  scheduled: Array<{ args: unknown; delay: number }>
}

function fakeMutationCtx(seed: Seed[] = []): FakeCtx {
  const inserts: Array<{ table: string; doc: unknown }> = []
  const patches: Array<{ id: string; patch: unknown }> = []
  const scheduled: Array<{ args: unknown; delay: number }> = []
  const rows = new Map(seed.map(([, doc]) => [String(doc._id), doc]))

  return {
    inserts,
    patches,
    scheduled,
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

          return {
            first: async () =>
              [...rows.values()].find(
                (row) => rowTable(row, table) && matches(row, filters)
              ) ?? null,
          }
        },
      }),
    },
    scheduler: {
      runAfter: async (delay: number, _reference: unknown, args: unknown) => {
        scheduled.push({ args, delay })

        return "scheduled"
      },
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
