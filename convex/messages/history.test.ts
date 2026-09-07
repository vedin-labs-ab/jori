import { describe, expect, test } from "vitest"
import { tableDoc, testOwner } from "../../test/convex/collections"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { type Doc } from "../_generated/dataModel"
import {
  type ConversationEntry,
  mergeRecentConversation,
  recentConversation,
} from "./history"

describe("message conversation history", () => {
  test("keeps messages in chronological conversation context", () => {
    expect(
      mergeRecentConversation([
        entry("message-2", "User", "thanks", 3000, "message.channels"),
        entry("jori-1", "Jori", "On it.", 2000, "message.channels"),
        entry("message-1", "User", "hello", 1000, "message.channels"),
      ])
    ).toEqual([
      entry("message-1", "User", "hello", 1000, "message.channels"),
      entry("jori-1", "Jori", "On it.", 2000, "message.channels"),
      entry("message-2", "User", "thanks", 3000, "message.channels"),
    ])
  })
})

function entry(
  id: string,
  actor: string,
  text: string,
  createdAt: number,
  type: string
): ConversationEntry {
  return {
    actor,
    actorIds: [],
    context: null,
    createdAt,
    id,
    identifiers: [],
    observedAt: null,
    reactions: null,
    source: actor === "Jori" ? "self" : "person",
    text,
    type,
  }
}

test("a console message's context and mentions reach the model as lines under it", async () => {
  const { database, ctx } = databaseContext()
  const tableId = await database.insert(
    "collections",
    tableDoc({ name: "Customer renewals" })
  )
  const folderId = await database.insert("folders", {
    organizationId: "org",
    name: "Finance",
    visibility: { mode: "organization" },
    createdBy: testOwner,
    createdAt: 1,
    updatedAt: 1,
  })
  const chatId = await database.insert("conversations", {
    organizationId: "org",
    surface: "console",
    externalId: "",
    scope: "person",
    title: "Renewals",
    createdBy: testOwner,
    updatedAt: 1,
  })
  const messageId = await consoleMessage(database, {
    text: `Which of +[table:${tableId}] are at risk? Also +[job:gone]`,
    data: {
      context: { kind: "folder", id: folderId },
      references: [
        { kind: "table", id: tableId },
        { kind: "job", id: "gone" },
      ],
    },
    createdAt: 1,
  })

  await consoleMessage(database, {
    text: `See +[chat:${chatId}]`,
    data: {
      context: { kind: "table", id: "collections:404" },
      references: [{ kind: "chat", id: chatId }],
    },
    createdAt: 2,
  })

  const message = (await database.get(messageId)) as unknown as Doc<"messages">

  const { entries } = await recentConversation(ctx, message)

  expect(entries.map((entry) => entry.context)).toEqual([
    [
      `Opened about folder «Finance» (folderId: ${folderId})`,
      `+[table:${tableId}] mentions table «Customer renewals» (tableId: ${tableId})`,
      "+[job:gone] mentions a job that is no longer available (jobId: gone)",
    ].join("\n"),
    [
      "Opened about a table that is no longer available (tableId: collections:404)",
      `+[chat:${chatId}] mentions chat «Renewals» (conversationId: ${chatId})`,
    ].join("\n"),
  ])
})

/** The owner's message in the one console thread the test reads. */
async function consoleMessage(
  database: TestDatabase,
  message: { text: string; data: unknown; createdAt: number }
) {
  return await database.insert("messages", {
    organizationId: "org",
    surface: "console",
    type: "console.message",
    externalId: `m${message.createdAt}`,
    mentioned: true,
    actor: { kind: "person", personId: testOwner },
    personId: testOwner,
    conversationId: "c1",
    ...message,
  })
}
