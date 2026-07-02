import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { summaryOverlapMessageLimit, summarySourceMessageLimit } from "./limits"
import { loadSummaryMessages } from "./summary"

test("loads all source messages for small conversations", async () => {
  const messages = await loadSummaryMessages(
    fakeQueryCtx(messageRange(1, summarySourceMessageLimit)),
    conversation(),
    integration()
  )

  expect(texts(messages)).toEqual(messageNumbers(1, summarySourceMessageLimit))
})

test("loads overlap and new messages for large conversations", async () => {
  const messages = await loadSummaryMessages(
    fakeQueryCtx(messageRange(1, 120)),
    conversation({ summarizedAt: 100.5 }),
    integration()
  )

  expect(texts(messages)).toEqual(messageNumbers(76, 120))
  expect(messages).toHaveLength(summaryOverlapMessageLimit + 20)
})

test("prioritizes new messages over overlap within the source limit", async () => {
  const messages = await loadSummaryMessages(
    fakeQueryCtx(messageRange(1, 150)),
    conversation({ summarizedAt: 60.5 }),
    integration()
  )

  expect(messages).toHaveLength(summarySourceMessageLimit)
  expect(texts(messages)[0]).toBe("Message 51")
  expect(texts(messages)).not.toContain("Message 50")
  expect(texts(messages).at(-1)).toBe("Message 150")
})

function fakeQueryCtx(messages: Doc<"messages">[]): QueryCtx {
  return {
    db: {
      query: (table: string) => ({
        withIndex: (_index: string, build: (query: QueryFilter) => unknown) =>
          indexedQuery(table, messages, build),
      }),
    },
  } as unknown as QueryCtx
}

function indexedQuery(
  table: string,
  messages: Doc<"messages">[],
  build: (query: QueryFilter) => unknown
) {
  const filters: Filter[] = []

  build(queryFilter(filters))

  const matched = table === "messages" ? rowsFor(messages, filters) : []

  return {
    order: (direction: "asc" | "desc") => ({
      take: async (limit: number) =>
        sortRows(matched, direction).slice(0, limit),
    }),
  }
}

function queryFilter(filters: Filter[]): QueryFilter {
  const query = {
    eq: (field: string, value: unknown) => {
      filters.push({ field, operator: "eq", value })
      return query
    },
    gt: (field: string, value: unknown) => {
      filters.push({ field, operator: "gt", value })
      return query
    },
    lt: (field: string, value: unknown) => {
      filters.push({ field, operator: "lt", value })
      return query
    },
  }

  return query
}

function rowsFor(rows: Doc<"messages">[], filters: Filter[]) {
  return rows.filter((row) => filters.every((filter) => matches(row, filter)))
}

function matches(row: Row, filter: Filter) {
  const value = fieldValue(row, filter.field)

  if (filter.operator === "gt") {
    return typeof value === "number" && value > Number(filter.value)
  }

  if (filter.operator === "lt") {
    return typeof value === "number" && value < Number(filter.value)
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

function sortRows(rows: Doc<"messages">[], direction: "asc" | "desc") {
  const sorted = [...rows].sort(
    (left, right) => left.createdAt - right.createdAt
  )

  return direction === "desc" ? sorted.reverse() : sorted
}

function messageRange(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) =>
    message(start + index)
  )
}

function message(number: number): Doc<"messages"> {
  return {
    _id: id<"messages">(`message-${number}`),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    integration: "slack",
    type: "message.channels",
    externalId: `message-${number}`,
    mentioned: true,
    actor: { externalId: "U123", kind: "person", name: "Albin" },
    conversationId: "conversation",
    text: `Message ${number}`,
    createdAt: number,
  }
}

function conversation(
  overrides: Partial<Doc<"conversations">> = {}
): Doc<"conversations"> {
  return {
    _id: id<"conversations">("conversation"),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    externalId: "conversation",
    visibility: "public",
    ...overrides,
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

function messageNumbers(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    return `Message ${start + index}`
  })
}

function texts(messages: Array<{ text: string }>) {
  return messages.map((message) => message.text)
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}

type Filter = {
  field: string
  operator: "eq" | "gt" | "lt"
  value: unknown
}

type QueryFilter = {
  eq: (field: string, value: unknown) => QueryFilter
  gt: (field: string, value: unknown) => QueryFilter
  lt: (field: string, value: unknown) => QueryFilter
}

type Row = Record<string, unknown>
