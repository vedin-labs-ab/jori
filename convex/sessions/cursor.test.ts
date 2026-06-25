import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { collectPendingBatch, formatRuntimeMessage } from "./cursor"

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

test("advances across self messages without returning them as user input", () => {
  const batch = collectPendingBatch(
    [
      message("last", 1, "Already consumed."),
      message("approval", 2, "Milo needs approval.", {
        actor: { externalId: "UBOT", kind: "self" },
      }),
      message("next", 3, "Follow up.", {
        actor: { externalId: "U123", kind: "user" },
      }),
    ],
    session("last", 1),
    10,
    false
  )

  expect(batch.messages.map((item) => item._id)).toEqual(["next"])
  expect(batch.cursor?._id).toBe("next")
  expect(batch.hasMore).toBe(false)
})

test("advances the cursor when only self messages are pending", () => {
  const batch = collectPendingBatch(
    [
      message("last", 1, "Already consumed."),
      message("approval", 2, "Milo needs approval.", {
        actor: { externalId: "UBOT", kind: "self" },
      }),
    ],
    session("last", 1),
    10,
    false
  )

  expect(batch.messages).toEqual([])
  expect(batch.cursor?._id).toBe("approval")
})

test("formats runtime messages with normalized text and Slack identifiers", () => {
  expect(
    formatRuntimeMessage(
      message("next", 3, "<@UBOT> follow-up", {
        actor: { externalId: "U123", kind: "user", name: "Albin" },
        data: { ts: "123.456" },
        mentioned: true,
      }),
      integration({ data: { botUserId: "UBOT" } })
    )
  ).toMatchObject({
    actor: "Albin",
    actorIds: ["slack:user:U123"],
    identifiers: [
      "internal:message:next",
      "slack:message:123.456",
      "slack:thread:123.456",
    ],
    replyTarget: null,
    text: "@Milo follow-up",
  })
})

function session(messageId: string, timestamp: number): Doc<"sessions"> {
  return {
    _id: id<"sessions">("session"),
    _creationTime: 0,
    watchId: id<"watches">("watch"),
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
  text?: string,
  overrides: Partial<Doc<"messages">> = {}
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
    ...overrides,
  }
}

function integration(overrides: Partial<Doc<"integrations">>) {
  return {
    data: {},
    ...overrides,
  } as Doc<"integrations">
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}
