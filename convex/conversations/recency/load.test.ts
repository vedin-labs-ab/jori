import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { loadRecentActivity, type RecencyRun } from "./load"

const now = Date.UTC(2026, 6, 2, 8, 57)

test("loads tenant summaries with conversation-level identifiers", async () => {
  const ctx = fakeQueryCtx([
    ["messages", personMessage({ id: "m1", thread: "t1" })],
    ["conversations", conversation({ id: "c1", thread: "t1" })],
  ])
  const entries = await loadRecentActivity(ctx, query(run("conversation")))

  expect(entries).toMatchObject([
    {
      ageMs: 19 * 60_000,
      conversationId: id<"conversations">("c1"),
      identifiers: [
        "internal:conversation:c1",
        "slack:channel:C1",
        "slack:thread:t1",
      ],
      kind: "summary",
      summary: "Albin wants a cartoon avatar.",
    },
  ])
  expect(entries[0]?.identifiers).not.toContain("slack:message:m1.000000")
})

test("keeps narrower context inside the person's own person-scoped run", async () => {
  const seed: Seed[] = [
    ["messages", personMessage({ id: "m1", thread: "t1" })],
    [
      "conversations",
      conversation({ id: "c1", scope: "conversation", thread: "t1" }),
    ],
  ]
  const load = (recencyRun: RecencyRun) =>
    loadRecentActivity(fakeQueryCtx(seed), query(recencyRun))

  await expect(load(run("person"))).resolves.toHaveLength(1)
  await expect(load(run("conversation"))).resolves.toHaveLength(0)
  await expect(load(run("tenant"))).resolves.toHaveLength(0)
  await expect(
    load({ ...run("person"), personId: id<"persons">("other") })
  ).resolves.toHaveLength(0)
  await expect(
    load({ ...run("person"), personId: undefined })
  ).resolves.toHaveLength(0)
})

test("returns references for conversations already summarized in the run", async () => {
  const ctx = fakeQueryCtx([
    ["messages", personMessage({ id: "m1", thread: "t1" })],
    ["conversations", conversation({ id: "c1", thread: "t1" })],
  ])
  const entries = await loadRecentActivity(ctx, {
    ...query(run("conversation")),
    seen: [id<"conversations">("c1")],
  })

  expect(entries).toEqual([
    {
      conversationId: id<"conversations">("c1"),
      identifiers: [
        "internal:conversation:c1",
        "slack:channel:C1",
        "slack:thread:t1",
      ],
      integration: "slack",
      kind: "reference",
    },
  ])
})

test("applies the privacy gate to references too", async () => {
  const ctx = fakeQueryCtx([
    ["messages", personMessage({ id: "m1", thread: "t1" })],
    [
      "conversations",
      conversation({ id: "c1", scope: "conversation", thread: "t1" }),
    ],
  ])
  const entries = await loadRecentActivity(ctx, {
    ...query(run("conversation")),
    seen: [id<"conversations">("c1")],
  })

  expect(entries).toHaveLength(0)
})

test("caps summaries, skips the current and summaryless conversations", async () => {
  const seed: Seed[] = [
    ["messages", personMessage({ id: "m0", thread: "current", at: 0 })],
    [
      "conversations",
      conversation({ id: "current-conversation", thread: "current" }),
    ],
    ["messages", personMessage({ id: "m7", thread: "t7", at: 7 })],
    ["conversations", conversation({ id: "c7", summary: null, thread: "t7" })],
  ]

  for (const index of [1, 2, 3, 4, 5, 6]) {
    seed.push(
      [
        "messages",
        personMessage({ id: `m${index}`, thread: `t${index}`, at: index }),
      ],
      ["conversations", conversation({ id: `c${index}`, thread: `t${index}` })]
    )
  }

  const entries = await loadRecentActivity(
    fakeQueryCtx(seed),
    query(run("tenant"))
  )

  expect(entries).toHaveLength(5)
  expect(entries.map((entry) => entry.conversationId)).toEqual(
    ["c6", "c5", "c4", "c3", "c2"].map((value) => id<"conversations">(value))
  )
})

function query(recencyRun: RecencyRun) {
  return {
    now,
    personId: id<"persons">("person"),
    run: recencyRun,
    seen: [],
    tenantId: "tenant",
  }
}

function run(scope: RecencyRun["scope"]): RecencyRun {
  return {
    conversationId: id<"conversations">("current-conversation"),
    personId: id<"persons">("person"),
    scope,
  }
}

function personMessage(args: {
  at?: number
  id: string
  thread: string
}): Doc<"messages"> {
  return {
    _id: id<"messages">(args.id),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    integration: "slack",
    type: "message.channels",
    externalId: `slack:team:${args.id}`,
    mentioned: false,
    actor: { externalId: "U1", kind: "person", name: "Albin" },
    personId: id<"persons">("person"),
    conversationId: args.thread,
    text: "Please help.",
    createdAt: now - 60_000 + (args.at ?? 0),
    data: {
      channel: { id: "C1" },
      thread: { ts: args.thread },
      ts: `${args.id}.000000`,
    },
  }
}

function conversation(args: {
  id: string
  scope?: Doc<"conversations">["scope"]
  summary?: string | null
  thread: string
}): Doc<"conversations"> {
  return {
    _id: id<"conversations">(args.id),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    externalId: args.thread,
    scope: args.scope ?? "tenant",
    ...(args.summary === null
      ? {}
      : {
          summarizedAt: now - 19 * 60_000,
          summary: args.summary ?? "Albin wants a cartoon avatar.",
        }),
  }
}

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
  const value = row[filter.field]

  if (filter.operator === "gte") {
    return typeof value === "number" && value >= Number(filter.value)
  }

  return value === filter.value
}

function sortRows(rows: Row[], direction: "asc" | "desc") {
  const sorted = [...rows].sort(
    (left, right) => Number(left.createdAt) - Number(right.createdAt)
  )

  return direction === "desc" ? sorted.reverse() : sorted
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
