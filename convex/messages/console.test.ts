import { expect, test } from "vitest"
import { type ReplyPart } from "../../contracts/replies/parts"
import { databaseContext } from "../../test/convex/database"
import { type Doc, type Id } from "../_generated/dataModel"
import { readRunDraft, writeRunDraft } from "../runs/execution/drafts/data"
import { pageConsoleMessages } from "./console"
import { insertConsoleMessage, insertConsoleReply } from "./console/records"

const personId = "persons:1" as Id<"persons">
const parts: ReplyPart[] = [
  { kind: "reference", target: { kind: "table", id: "collections_1" } },
  { kind: "choices", options: [{ label: "Open it" }] },
]
const runId = "runs:1" as Id<"runs">

test("pages a conversation newest first with each side's role", async () => {
  const { database, ctx } = databaseContext()
  const conversation = await consoleConversation(database)

  const question = await insertConsoleMessage(ctx, {
    actor: { kind: "person", personId },
    conversation,
    data: { context: { kind: "folder", id: "folders:1" } },
    mentioned: true,
    now: 1_000,
    text: "What changed this week?",
  })
  await writeRunDraft(ctx, { runId, reasoning: "", text: "Three", turn: 1 })
  const reply = await insertConsoleReply(ctx, {
    conversationId: conversation._id,
    parts,
    runId,
    text: "Three things.",
  })

  expect(await readRunDraft(ctx, runId)).toBeNull()
  expect(reply).toMatchObject({
    surface: "console",
    actor: { kind: "self", externalId: "console" },
    mentioned: false,
    data: { parts },
  })
  expect(reply).not.toHaveProperty("personId")
  expect(reply.externalId).not.toBe(question.externalId)
  expect((await database.get(conversation._id))?.updatedAt).toBe(
    reply.createdAt
  )

  const page = await pageConsoleMessages(ctx, conversation, {
    cursor: null,
    numItems: 10,
  })

  expect(page.isDone).toBe(true)
  expect(page.page).toMatchObject([
    {
      id: reply._id,
      role: "jori",
      text: "Three things.",
      data: { parts },
      createdAt: reply.createdAt,
    },
    {
      id: question._id,
      role: "person",
      author: { id: personId, name: "Member", isViewer: false },
      text: "What changed this week?",
      data: { context: { kind: "folder", id: "folders:1" } },
      createdAt: 1_000,
    },
  ])
})

test("replies only land in console conversations", async () => {
  const { database, ctx } = databaseContext()
  const conversationId = await database.insert("conversations", {
    organizationId: "org",
    surface: "slack",
    integrationId: "integrations:1",
    externalId: "C123",
    scope: "organization",
  })

  await expect(
    insertConsoleReply(ctx, { conversationId, runId, text: "Hello" })
  ).rejects.toThrow("Console conversation not found.")
})

async function consoleConversation(
  database: ReturnType<typeof databaseContext>["database"]
) {
  const conversationId = await database.insert("conversations", {
    organizationId: "org",
    surface: "console",
    externalId: "",
    scope: "person",
    createdBy: personId,
    updatedAt: 0,
  })

  await database.insert("runs", { _id: runId, status: "running" })
  await database.insert("sessions", {
    conversationId: conversationId,
    runId,
    updatedAt: 0,
  })
  await database.patch(conversationId, { externalId: conversationId })

  return (await database.get(conversationId)) as unknown as Doc<"conversations">
}

test("shared message authors identify each participant and the current viewer", async () => {
  const { database, ctx } = databaseContext()
  const conversation = await consoleConversation(database)
  const otherId = "persons:other" as Id<"persons">
  for (const [authorId, name, now] of [
    [personId, "Maya", 1],
    [otherId, "Alex", 2],
  ] as const) {
    await insertConsoleMessage(ctx, {
      conversation,
      actor: { kind: "person", personId: authorId, name },
      data: undefined,
      mentioned: true,
      now,
      text: name,
    })
  }
  const page = await pageConsoleMessages(
    ctx,
    conversation,
    { cursor: null, numItems: 10 },
    personId
  )
  expect(page.page.map((message) => message.author)).toMatchObject([
    { id: otherId, name: "Alex", isViewer: false },
    { id: personId, name: "Maya", isViewer: true },
  ])
})
