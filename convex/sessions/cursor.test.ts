import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { collectPendingBatch } from "./cursor"

test("advances the cursor across non-text messages", () => {
  const batch = collectPendingBatch(
    [
      message("last", 1, "Already consumed."),
      message("empty", 2),
      message("next", 3, "Use this."),
    ],
    session("last", 1),
    10,
    false
  )

  expect(batch.messages.map((item) => item._id)).toEqual(["next"])
  expect(batch.cursor?._id).toBe("next")
  expect(batch.hasMore).toBe(false)
})

test("does not advance past the returned message limit", () => {
  const batch = collectPendingBatch(
    [message("first", 2, "First."), message("second", 3, "Second.")],
    session("last", 1),
    1,
    false
  )

  expect(batch.messages.map((item) => item._id)).toEqual(["first"])
  expect(batch.cursor?._id).toBe("first")
  expect(batch.hasMore).toBe(true)
})

function session(messageId: string, timestamp: number): Doc<"sessions"> {
  return {
    _id: id<"sessions">("session"),
    _creationTime: 0,
    conversationId: id<"conversations">("conversation"),
    cursor: {
      messageId: id<"messages">(messageId),
      timestamp,
    },
    updatedAt: 0,
  }
}

function message(
  messageId: string,
  creationTime: number,
  text?: string
): Doc<"messages"> {
  return {
    _id: id<"messages">(messageId),
    _creationTime: creationTime,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    integration: "slack",
    type: "message",
    externalId: messageId,
    mentioned: false,
    text,
    createdAt: creationTime,
  }
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}
