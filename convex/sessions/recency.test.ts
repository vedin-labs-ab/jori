import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { emitRecencyContexts } from "./recency"

test("emits the trigger person's bundle on first drain and records state", async () => {
  const emission = await emitRecencyContexts(
    fakeCtx(baseSeed()),
    session({ due: [id<"persons">("person")] }),
    []
  )

  expect(emission?.contexts).toHaveLength(1)
  expect(emission?.contexts[0]).toContain("# Recent activity — Albin")
  expect(emission?.contexts[0]).toContain("Albin wants a cartoon avatar.")
  expect(emission?.recency).toEqual({
    due: [],
    done: [id<"persons">("person")],
    seen: [id<"conversations">("c1")],
  })
})

test("returns null when nobody new is due", async () => {
  const emission = await emitRecencyContexts(
    fakeCtx(baseSeed()),
    session({ done: [id<"persons">("person")] }),
    [message({ id: "m2", personId: "person", thread: "t1" })]
  )

  expect(emission).toBeNull()
})

test("canonicalizes merged persons before deduping", async () => {
  const seed = [
    ...baseSeed(),
    ["persons", person({ id: "old", supersededBy: "person" })],
  ] satisfies Seed[]
  const emission = await emitRecencyContexts(
    fakeCtx(seed),
    session({ done: [id<"persons">("person")] }),
    [message({ id: "m2", personId: "old", thread: "t1" })]
  )

  expect(emission).toBeNull()
})

test("marks a batch sender done even when nothing is loadable", async () => {
  const emission = await emitRecencyContexts(
    fakeCtx(baseSeed()),
    session({ done: [id<"persons">("person")] }),
    [message({ id: "m2", name: "Sam", personId: "other", thread: "t9" })]
  )

  expect(emission?.contexts).toEqual([])
  expect(emission?.recency.done).toEqual([
    id<"persons">("person"),
    id<"persons">("other"),
  ])
})

test("names a batch sender's bundle from their message actor", async () => {
  const seed = [
    ...baseSeed(),
    [
      "messages",
      message({ id: "m2", name: "Sam", personId: "other", thread: "t2" }),
    ],
    ["conversations", conversation({ id: "c2", thread: "t2" })],
  ] satisfies Seed[]
  const emission = await emitRecencyContexts(fakeCtx(seed), session({}), [
    message({ id: "m2", name: "Sam", personId: "other", thread: "t2" }),
  ])

  expect(emission?.contexts).toHaveLength(1)
  expect(emission?.contexts[0]).toContain("# Recent activity — Sam")
  expect(emission?.recency.done).toEqual([id<"persons">("other")])
})

function baseSeed(): Seed[] {
  return [
    ["runs", run()],
    ["persons", person({ id: "person" })],
    ["persons", person({ id: "other" })],
    [
      "messages",
      message({ id: "trigger", personId: "person", thread: "current" }),
    ],
    ["messages", message({ id: "m1", personId: "person", thread: "t1" })],
    ["conversations", conversation({ id: "c1", thread: "t1" })],
  ]
}

function session(
  recency: Partial<NonNullable<Doc<"sessions">["recency"]>>
): Doc<"sessions"> {
  return {
    _id: id<"sessions">("session"),
    _creationTime: 0,
    conversationId: id<"conversations">("current-conversation"),
    runId: id<"runs">("run"),
    recency: { due: [], done: [], seen: [], ...recency },
    updatedAt: 0,
  }
}

function run(): Doc<"runs"> {
  return {
    _id: id<"runs">("run"),
    _creationTime: 0,
    tenantId: "tenant",
    scope: "tenant",
    conversationId: id<"conversations">("current-conversation"),
    cause: {
      type: "message",
      messageId: id<"messages">("trigger"),
      kind: "mention",
    },
    snapshot: {
      title: "Request",
      source: { type: "message", surface: "slack" },
      context: [],
    },
    status: "running",
    createdBy: id<"persons">("person"),
    createdAt: Date.now(),
  }
}

function person(args: { id: string; supersededBy?: string }): Doc<"persons"> {
  return {
    _id: id<"persons">(args.id),
    _creationTime: 0,
    tenantId: "tenant",
    ...(args.supersededBy === undefined
      ? {}
      : { supersededBy: id<"persons">(args.supersededBy) }),
    createdAt: 0,
    updatedAt: 0,
  }
}

function message(args: {
  id: string
  name?: string
  personId: string
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
    actor: {
      externalId: "U1",
      kind: "person",
      name: args.name ?? "Albin",
    },
    personId: id<"persons">(args.personId),
    conversationId: args.thread,
    text: "Please help.",
    createdAt: Date.now() - 60_000,
    data: { channel: { id: "C1" }, thread: { ts: args.thread } },
  }
}

function conversation(args: {
  id: string
  thread: string
}): Doc<"conversations"> {
  return {
    _id: id<"conversations">(args.id),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    externalId: args.thread,
    scope: "tenant",
    summarizedAt: Date.now() - 19 * 60_000,
    summary: "Albin wants a cartoon avatar.",
  }
}

function fakeCtx(seed: Seed[]): QueryCtx {
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

  const matched = seed
    .filter(([rowTable]) => rowTable === table)
    .map(([, row]) => row)
    .filter((row) =>
      filters.every((filter) =>
        filter.operator === "gte"
          ? Number(row[filter.field]) >= Number(filter.value)
          : row[filter.field] === filter.value
      )
    )

  return {
    order: () => ({ take: async (limit: number) => matched.slice(0, limit) }),
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
type Seed = [keyof DataModel & string, Row]

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}
