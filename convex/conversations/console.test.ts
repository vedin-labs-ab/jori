import { expect, test, vi } from "vitest"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { type Doc, type Id } from "../_generated/dataModel"
import { writeRunDraft } from "../runs/execution/drafts/data"
import {
  listConsoleConversations,
  readLiveState,
  sendConsoleMessage,
} from "./console"
import { findVisibleConsoleConversation } from "./resolve"

// Starting a run hands it to the workflow component, which needs a real
// backend; these tests are about the rows a console message writes.
vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

const organizationId = "org"
const paginationOpts = { cursor: null, numItems: 10 }

test("the first message opens a person-scoped conversation and starts a run", async () => {
  const { database, ctx } = databaseContext()
  const personId = await person(database)

  const result = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: { name: "Albin" },
    text: "\nPlan the launch\nWith three milestones.",
  })

  expect(result.status).toBe("started")

  const conversation = await database.get(result.conversationId)
  const message = await database.get(result.messageId)
  const [run] = await rows<Doc<"runs">>(database, "runs")

  expect(conversation).toMatchObject({
    surface: "console",
    scope: "person",
    externalId: result.conversationId,
    title: "Plan the launch",
    createdBy: personId,
  })
  expect(conversation).not.toHaveProperty("integrationId")
  expect(message).toMatchObject({
    surface: "console",
    type: "console.message",
    mentioned: true,
    conversationId: result.conversationId,
    actor: { kind: "person", personId, name: "Albin" },
    personId,
    text: "Plan the launch\nWith three milestones.",
  })
  expect(message).not.toHaveProperty("integrationId")
  expect(run).toMatchObject({
    organizationId,
    audience: "person",
    conversationId: result.conversationId,
    cause: { type: "message", messageId: result.messageId, kind: "mention" },
    principal: { kind: "person", personId },
    snapshot: {
      title: "Plan the launch",
      source: { type: "message", surface: "jori" },
      context: [],
    },
  })
  expect(run).not.toHaveProperty("folderId")
})

test("an answer to a reply's choices travels with the message", async () => {
  const { database, ctx } = databaseContext()
  const personId = await person(database)
  const first = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Post the summary?",
  })
  await finishRun(database)
  const answer = { messageId: first.messageId, part: 0, values: ["post"] }

  const second = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    conversationId: first.conversationId,
    text: "Yes, post it",
    answer,
  })

  expect(await database.get(second.messageId)).toMatchObject({
    text: "Yes, post it",
    data: { answer },
  })
})

test("a blocked budget keeps the message without a run", async () => {
  const { database, ctx } = databaseContext()
  const personId = await person(database)

  await database.insert("accounts", {
    organizationId,
    state: { kind: "paused" },
    micros: { allowance: 0, wallet: 0 },
    topUp: { charged: { micros: 0 } },
    updatedAt: 0,
  })

  const result = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Anyone there?",
  })

  expect(result.status).toBe("blocked")
  expect(await database.get(result.messageId)).not.toBeNull()
  expect(await rows(database, "runs")).toEqual([])
  expect(
    await readLiveState(ctx, await conversation(database, result))
  ).toEqual({ run: null, draft: null })
})

test("lists a person's own conversations, most recently active first", async () => {
  const { database, ctx } = databaseContext()
  const personId = await person(database)
  const otherPersonId = await person(database)

  vi.useFakeTimers()
  vi.setSystemTime(1_000)
  const older = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Older",
  })
  vi.setSystemTime(2_000)
  const newer = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Newer",
  })
  vi.setSystemTime(3_000)
  await sendConsoleMessage(ctx, {
    organizationId,
    personId: otherPersonId,
    profile: {},
    text: "Someone else's",
  })
  vi.useRealTimers()

  const result = await listConsoleConversations(ctx, {
    organizationId,
    personId,
    paginationOpts,
  })

  expect(result.page).toEqual([
    { id: newer.conversationId, title: "Newer", updatedAt: 2_000 },
    { id: older.conversationId, title: "Older", updatedAt: 1_000 },
  ])
})

test("only the creator sees a console conversation", async () => {
  const { database, ctx } = databaseContext()
  const personId = await person(database)
  const otherPersonId = await person(database)
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Private thought.",
  })
  const args = { conversationId: sent.conversationId, organizationId }

  expect(
    await findVisibleConsoleConversation(ctx, { ...args, personId })
  ).toMatchObject({ _id: sent.conversationId })
  expect(
    await findVisibleConsoleConversation(ctx, {
      ...args,
      personId: otherPersonId,
    })
  ).toBeNull()
  expect(
    await findVisibleConsoleConversation(ctx, {
      ...args,
      organizationId: "other-org",
      personId,
    })
  ).toBeNull()
  await expect(
    sendConsoleMessage(ctx, {
      organizationId,
      personId: otherPersonId,
      profile: {},
      conversationId: sent.conversationId,
      text: "Let me in.",
    })
  ).rejects.toThrow("Conversation not found.")
})

test("reports the session's run and the reply it is drafting", async () => {
  const { database, ctx } = databaseContext()
  const personId = await person(database)
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Go.",
  })
  const [run] = await rows<Doc<"runs">>(database, "runs")
  const live = await conversation(database, sent)

  expect(await readLiveState(ctx, live)).toEqual({
    run: { id: run._id, status: "queued" },
    draft: null,
  })

  const draft = { reasoning: "Reading the notes.", text: "On it" }

  await writeRunDraft(ctx, { ...draft, runId: run._id, turn: 1 })

  expect(await readLiveState(ctx, live)).toEqual({
    run: { id: run._id, status: "queued" },
    draft,
  })

  // A run that did not finish says how it ended, so the thread can.
  await database.patch(run._id, {
    status: "failed",
    error: "Sandbox timed out",
    endedAt: 5_000,
  })

  expect((await readLiveState(ctx, live)).run).toEqual({
    id: run._id,
    status: "failed",
    error: "Sandbox timed out",
    endedAt: 5_000,
  })
})

async function person(database: TestDatabase) {
  return await database.insert("persons", { organizationId })
}

async function conversation(
  database: TestDatabase,
  sent: { conversationId: Id<"conversations"> }
) {
  const conversation = await database.get(sent.conversationId)

  if (conversation === null) {
    throw new Error("Conversation not found.")
  }

  return conversation as unknown as Doc<"conversations">
}

async function finishRun(database: TestDatabase) {
  for (const run of await rows<Doc<"runs">>(database, "runs")) {
    await database.patch(run._id, { status: "completed" })
  }
}

async function rows<T>(database: TestDatabase, table: string) {
  return (await database
    .query(table)
    .withIndex("by_id")
    .collect()) as unknown as T[]
}
