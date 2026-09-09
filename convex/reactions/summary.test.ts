import { expect, test } from "vitest"
import { databaseContext, id } from "../../test/convex/database"
import { type Doc } from "../_generated/dataModel"
import { reactionSummariesForMessages } from "./summary"

const targetKey = "slack:message:C123:1710000000.000100"

test("omits opaque reaction actor ids from message summaries", async () => {
  const result = await reactionSummariesForMessages(
    await reactionContext([
      reaction("one", ":eyes:", { externalId: "U123", kind: "person" }),
    ]),
    [message()]
  )

  expect(result.get(message()._id)).toBe(":eyes: x1")
})

test("shows available reaction actor names and counts unnamed actors", async () => {
  const result = await reactionSummariesForMessages(
    await reactionContext([
      reaction("one", ":white_check_mark:", {
        externalId: "U123",
        kind: "person",
        name: "Albin",
      }),
      reaction("two", ":white_check_mark:", {
        externalId: "U456",
        kind: "person",
      }),
      reaction("three", ":white_check_mark:", {
        externalId: "U789",
        kind: "person",
        name: "Sarah",
      }),
    ]),
    [message()]
  )

  expect(result.get(message()._id)).toBe(
    ":white_check_mark: x3 (Albin, Sarah, +1)"
  )
})

async function reactionContext(reactions: Doc<"reactions">[]) {
  const { database, ctx } = databaseContext()
  for (const reaction of reactions) {
    await database.insert("reactions", reaction)
  }
  return ctx
}

function message(): Doc<"messages"> {
  return {
    _id: id<"messages">("message"),
    _creationTime: 0,
    organizationId: "organization",
    integrationId: id<"integrations">("integration"),
    surface: "slack",
    type: "message.channels",
    externalId: "message",
    mentioned: false,
    conversationId: "conversation",
    targetKey,
    text: "test",
    createdAt: 0,
  }
}

function reaction(
  reactionId: string,
  value: string,
  actor: Doc<"reactions">["actor"]
): Doc<"reactions"> {
  return {
    _id: id<"reactions">(reactionId),
    _creationTime: 0,
    organizationId: "organization",
    integrationId: id<"integrations">("integration"),
    integration: "slack",
    target: {
      key: targetKey,
      identifiers: ["slack:message:1710000000.000100"],
    },
    actor,
    reaction: value,
    observedAt: 0,
    updatedAt: 0,
    createdAt: 0,
  }
}
