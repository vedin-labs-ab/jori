import { describe, expect, test } from "vitest"
import { type ConversationEntry, mergeRecentConversation } from "./history"

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
