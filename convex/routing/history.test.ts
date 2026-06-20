import { describe, expect, test } from "vitest"
import {
  mergeRecentConversation,
  type RoutingConversationEntry,
} from "./history"

describe("message routing conversation history", () => {
  test("keeps messages in chronological conversation context", () => {
    expect(
      mergeRecentConversation([
        entry("message-2", "User", "thanks", 3000, "message.channels"),
        entry("milo-1", "Milo", "On it.", 2000, "message.channels"),
        entry("message-1", "User", "hello", 1000, "message.channels"),
      ])
    ).toEqual([
      entry("message-1", "User", "hello", 1000, "message.channels"),
      entry("milo-1", "Milo", "On it.", 2000, "message.channels"),
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
): RoutingConversationEntry {
  return {
    actor,
    createdAt,
    id,
    observedAt: null,
    source: actor === "Milo" ? "self" : "user",
    text,
    type,
  }
}
