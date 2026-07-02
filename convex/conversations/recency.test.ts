import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { loadRecentActivity } from "./recency"

const now = Date.UTC(2026, 6, 2, 8, 57)

test("loads recent activity with conversation-level identifiers", async () => {
  const activity = await loadRecentActivity(
    fakeQueryCtx([
      ["integrations", integration()],
      ["conversations", recentConversation()],
      ["messages", recentMessage()],
    ]),
    {
      message: currentMessage(),
      now,
      run: run(),
    }
  )

  expect(activity).toMatchObject([
    {
      ageMs: 19 * 60_000,
      conversationId: id<"conversations">("recent-conversation"),
      identifiers: [
        "internal:conversation:recent-conversation",
        "slack:channel:C0B948T2ZMF",
        "slack:thread:1782982628.890839",
      ],
      integration: "slack",
      summarizedAt: now - 19 * 60_000,
    },
  ])
  expect(activity[0]?.identifiers).not.toContain(
    "slack:message:1782982630.000000"
  )
})

function fakeQueryCtx(seed: Seed[]): QueryCtx {
  return {
    db: {
      get: async (rowId: string) =>
        seed.find(([, row]) => row._id === rowId)?.[1] ?? null,
      query: (table: string) => ({
        withIndex: (_index: string, build: (query: QueryFilter) => unknown) =>
          indexedQuery(table, seed, build),
      }),
    },
  } as unknown as QueryCtx
}

function indexedQuery(
  table: string,
  seed: Seed[],
  build: (query: QueryFilter) => unknown
) {
  const filters: Filter[] = []

  build(queryFilter(filters))

  const matched = rowsFor(table, seed, filters)

  return {
    order: (direction: "asc" | "desc") => ({
      take: async (limit: number) =>
        sortRows(matched, direction).slice(0, limit),
    }),
    take: async (limit: number) => matched.slice(0, limit),
    unique: async () => matched[0] ?? null,
  }
}

function queryFilter(filters: Filter[]): QueryFilter {
  const query = {
    eq: (field: string, value: unknown) => {
      filters.push({ field, operator: "eq", value })
      return query
    },
    gte: (field: string, value: unknown) => {
      filters.push({ field, operator: "gte", value })
      return query
    },
  }

  return query
}

function rowsFor(table: string, seed: Seed[], filters: Filter[]) {
  return seed
    .filter(([rowTable]) => rowTable === table)
    .map(([, row]) => row)
    .filter((row) => filters.every((filter) => matches(row, filter)))
}

function matches(row: Row, filter: Filter) {
  const value = fieldValue(row, filter.field)

  if (filter.operator === "gte") {
    return typeof value === "number" && value >= Number(filter.value)
  }

  return value === filter.value
}

function fieldValue(row: Row, field: string) {
  return field.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null) {
      return undefined
    }

    return (value as Row)[key]
  }, row)
}

function sortRows(rows: Row[], direction: "asc" | "desc") {
  const sorted = [...rows].sort(
    (left, right) => Number(left.createdAt) - Number(right.createdAt)
  )

  return direction === "desc" ? sorted.reverse() : sorted
}

function currentMessage(): Doc<"messages"> {
  return {
    ...messageBase("current-message"),
    conversationId: "current-thread",
  }
}

function recentMessage(): Doc<"messages"> {
  return {
    ...messageBase("recent-message"),
    conversationId: "1782982628.890839",
    data: {
      channel: { id: "C0B948T2ZMF" },
      thread: { ts: "1782982628.890839" },
      ts: "1782982630.000000",
    },
  }
}

function messageBase(messageId: string): Doc<"messages"> {
  return {
    _id: id<"messages">(messageId),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    integration: "slack",
    type: "message.channels",
    externalId: `slack:team:${messageId}`,
    mentioned: true,
    actor: { externalId: "U0B8LV61PC7", kind: "person", name: "Albin" },
    personId: id<"persons">("person"),
    conversationId: "thread",
    text: "Please help.",
    createdAt: now - 60_000,
  }
}

function recentConversation(): Doc<"conversations"> {
  return {
    _id: id<"conversations">("recent-conversation"),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    externalId: "1782982628.890839",
    visibility: "public",
    summarizedAt: now - 19 * 60_000,
    summary: "Albin wants Milo to generate a cartoon image/avatar of him.",
  }
}

function integration(): Doc<"integrations"> {
  return {
    _id: id<"integrations">("integration"),
    _creationTime: 0,
    tenantId: "tenant",
    integration: "slack",
    scope: "tenant",
    externalId: "team",
    credentials: {},
    status: "active",
    createdBy: id<"persons">("person"),
    createdAt: 0,
    updatedAt: 0,
  }
}

function run(): Doc<"runs"> {
  return {
    _id: id<"runs">("run"),
    _creationTime: 0,
    tenantId: "tenant",
    scope: "person",
    conversationId: id<"conversations">("current-conversation"),
    cause: {
      type: "message",
      messageId: id<"messages">("current-message"),
      kind: "mention",
    },
    snapshot: {
      title: "Current request",
      source: { type: "message", surface: "slack" },
      context: [],
    },
    status: "queued",
    createdBy: id<"persons">("person"),
    createdAt: now,
  }
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}

type Filter = {
  field: string
  operator: "eq" | "gte"
  value: unknown
}

type QueryFilter = {
  eq: (field: string, value: unknown) => QueryFilter
  gte: (field: string, value: unknown) => QueryFilter
}

type Row = Record<string, unknown>
type Seed = [string, Row]
