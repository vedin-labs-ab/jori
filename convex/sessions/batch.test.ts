import { expect, test } from "vitest"
import { id } from "../../test/convex/database"
import { type Doc } from "../_generated/dataModel"
import { collectPendingBatch, formatRuntimeMessage } from "./batch"

test.each([
  ["non-text", message("skipped", 2)],
  [
    "self-authored",
    message("skipped", 2, "Jori needs approval.", {
      actor: { externalId: "UBOT", kind: "self" },
    }),
  ],
])(
  "advances across %s messages without returning them as user input",
  (_kind, skipped) => {
    const batch = collectPendingBatch(
      [
        message("last", 1, "Already consumed."),
        skipped,
        message("next", 3, "Follow up.", {
          actor: { externalId: "U123", kind: "person" },
        }),
      ],
      session("last", 1),
      10,
      false
    )

    expect(batch.messages.map((item) => item._id)).toEqual(["next"])
    expect(batch.cursor?._id).toBe("next")
    expect(batch.hasMore).toBe(false)
  }
)

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

test("advances the cursor when only self messages are pending", () => {
  const batch = collectPendingBatch(
    [
      message("last", 1, "Already consumed."),
      message("approval", 2, "Jori needs approval.", {
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

test("formats runtime messages with stored text and Slack identifiers", () => {
  expect(
    formatRuntimeMessage(
      message("next", 3, "@Jori follow-up", {
        actor: { externalId: "U123", kind: "person", name: "Albin" },
        data: { ts: "123.456" },
        mentioned: true,
      })
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
    text: "@Jori follow-up",
  })
})

function session(messageId: string, createdAt: number): Doc<"sessions"> {
  return {
    _id: id<"sessions">("session"),
    _creationTime: 0,
    conversationId: id<"conversations">("conversation"),
    cursor: {
      message: {
        createdAt,
        messageId: id<"messages">(messageId),
      },
    },
    updatedAt: 0,
  }
}

function message(
  messageId: string,
  storedAt: number,
  text?: string,
  overrides: Partial<Doc<"messages">> = {}
): Doc<"messages"> {
  return {
    _id: id<"messages">(messageId),
    _creationTime: storedAt,
    organizationId: "organization",
    integrationId: id<"integrations">("integration"),
    surface: "slack",
    type: "message",
    externalId: messageId,
    mentioned: false,
    conversationId: "conversation",
    text,
    createdAt: storedAt,
    ...overrides,
  }
}
