import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { reactionSummariesForMessages } from "./summary"

const targetKey = "slack:message:C123:1710000000.000100"

test("omits opaque reaction actor ids from message summaries", async () => {
  const result = await reactionSummariesForMessages(
    fakeQueryCtx([
      reaction("one", ":eyes:", { externalId: "U123", kind: "person" }),
    ]),
    [message()]
  )

  expect(result.get(message()._id)).toBe(":eyes: x1")
})

test("shows available reaction actor names and counts unnamed actors", async () => {
  const result = await reactionSummariesForMessages(
    fakeQueryCtx([
      reaction("one", ":white_check_mark:", {
        externalId: "U123",
        kind: "person",
        name: "Albin",
      }),
      reaction("two", ":white_check_mark:", {
        externalId: "U456",
        kind: "person",
      }),
      reaction("three", ":white_check_mark:", {
        externalId: "U789",
        kind: "person",
        name: "Sarah",
      }),
    ]),
    [message()]
  )

  expect(result.get(message()._id)).toBe(
    ":white_check_mark: x3 (Albin, Sarah, +1)"
  )
})

function fakeQueryCtx(reactions: Doc<"reactions">[]): QueryCtx {
  return {
    db: {
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
            take: async (limit: number) =>
              table === "reactions"
                ? rowsFor(reactions, filters).slice(0, limit)
                : [],
          }
        },
      }),
    },
  } as unknown as QueryCtx
}

function rowsFor(rows: Doc<"reactions">[], filters: [string, unknown][]) {
  return rows.filter((row) =>
    filters.every(([field, value]) => fieldValue(row, field) === value)
  )
}

function fieldValue(row: Record<string, unknown>, field: string) {
  return field.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null) {
      return undefined
    }

    return (value as Record<string, unknown>)[key]
  }, row)
}

function message(): Doc<"messages"> {
  return {
    _id: id<"messages">("message"),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    integration: "slack",
    type: "message.channels",
    externalId: "message",
    mentioned: false,
    conversationId: "conversation",
    targetKey,
    text: "test",
    createdAt: 0,
  }
}

function reaction(
  reactionId: string,
  value: string,
  actor: Doc<"reactions">["actor"]
): Doc<"reactions"> {
  return {
    _id: id<"reactions">(reactionId),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    integration: "slack",
    target: {
      key: targetKey,
      identifiers: ["slack:message:1710000000.000100"],
    },
    actor,
    reaction: value,
    observedAt: 0,
    updatedAt: 0,
    createdAt: 0,
  }
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}

type QueryFilter = {
  eq: (field: string, value: unknown) => QueryFilter
}
