import { expect, test } from "vitest"
import { type ReplyPart } from "../../contracts/replies/parts"
import { databaseContext } from "../../test/convex/database"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  consoleMessageFolderId,
  insertConsoleMessage,
  insertConsoleReply,
  pageConsoleMessages,
} from "./console"

const personId = "persons:1" as Id<"persons">
const parts: ReplyPart[] = [
  { kind: "reference", target: { kind: "table", id: "collections_1" } },
  { kind: "choices", options: [{ label: "Open it" }] },
]

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
  const reply = await insertConsoleReply(ctx, {
    conversationId: conversation._id,
    parts,
    text: "Three things.",
  })

  expect(question).toMatchObject({
    surface: "console",
    type: "console.message",
    conversationId: conversation.externalId,
    personId,
  })
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
  expect(page.page).toEqual([
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
    insertConsoleReply(ctx, { conversationId, text: "Hello" })
  ).rejects.toThrow("Console conversation not found.")
})

test("reads the folder a message was sent from", () => {
  expect(
    consoleMessageFolderId({ context: { kind: "folder", id: "folders:1" } })
  ).toBe("folders:1")
  expect(consoleMessageFolderId({ context: { kind: "file", id: "f" } })).toBe(
    undefined
  )
  expect(consoleMessageFolderId(undefined)).toBe(undefined)
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

  await database.patch(conversationId, { externalId: conversationId })

  return (await database.get(conversationId)) as unknown as Doc<"conversations">
}
