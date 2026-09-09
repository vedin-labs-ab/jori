import { expect, test } from "vitest"
import { databaseContext, id } from "../../test/convex/database"
import { type DataModel, type Doc } from "../_generated/dataModel"
import { emitRecencyContexts } from "./recency"

test("stores the trigger person's bundle as the requester context", async () => {
  const emission = await emitRecencyContexts(
    await seedContext(baseSeed()),
    session({ due: [id<"persons">("person")] }),
    []
  )

  expect(emission?.contexts).toEqual([])
  expect(emission?.recency.requester).toContain("# Person context")
  expect(emission?.recency.requester).toContain("Name: Albin")
  expect(emission?.recency.requester).toContain("Albin wants a cartoon avatar.")
  expect(emission?.recency).toMatchObject({
    due: [],
    done: [id<"persons">("person")],
    seen: [id<"conversations">("c1")],
  })
})

test("returns null when nobody new is due", async () => {
  const emission = await emitRecencyContexts(
    await seedContext(baseSeed()),
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
    await seedContext(seed),
    session({ done: [id<"persons">("person")] }),
    [message({ id: "m2", personId: "old", thread: "t1" })]
  )

  expect(emission).toBeNull()
})

test("marks a batch sender done even when nothing is loadable", async () => {
  const emission = await emitRecencyContexts(
    await seedContext(baseSeed()),
    session({ done: [id<"persons">("person")] }),
    [message({ id: "m2", name: "Sam", personId: "other", thread: "t9" })]
  )

  expect(emission?.contexts).toEqual([])
  expect(emission?.recency.done).toEqual([
    id<"persons">("person"),
    id<"persons">("other"),
  ])
})

test("emits a batch sender as context and keeps the stored requester", async () => {
  const seed = [
    ...baseSeed(),
    [
      "messages",
      message({ id: "m2", name: "Sam", personId: "other", thread: "t2" }),
    ],
    ["conversations", conversation({ id: "c2", thread: "t2" })],
  ] satisfies Seed[]
  const emission = await emitRecencyContexts(
    await seedContext(seed),
    session({
      done: [id<"persons">("person")],
      requester: "stored requester context",
    }),
    [message({ id: "m2", name: "Sam", personId: "other", thread: "t2" })]
  )

  expect(emission?.contexts).toHaveLength(1)
  expect(emission?.contexts[0]).toContain("Name: Sam")
  expect(emission?.recency.requester).toBe("stored requester context")
  expect(emission?.recency.done).toEqual([
    id<"persons">("person"),
    id<"persons">("other"),
  ])
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
    organizationId: "organization",
    audience: "organization",
    principal: { kind: "person", personId: id<"persons">("person") },
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
    organizationId: "organization",
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
    organizationId: "organization",
    integrationId: id<"integrations">("integration"),
    surface: "slack",
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
    organizationId: "organization",
    surface: "slack",
    integrationId: id<"integrations">("integration"),
    externalId: args.thread,
    scope: "organization",
    summarizedAt: Date.now() - 19 * 60_000,
    summary: "Albin wants a cartoon avatar.",
  }
}

async function seedContext(seed: Seed[]) {
  const { database, ctx } = databaseContext()
  for (const [table, row] of seed) {
    await database.insert(table, row)
  }
  return ctx
}

type Row = Record<string, unknown>
type Seed = [keyof DataModel & string, Row]
