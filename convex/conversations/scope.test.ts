import { expect, test } from "vitest"
import { canIncludeRecentConversation } from "./scope"

test("includes tenant recency everywhere and private recency only in person scope", () => {
  expect(
    canIncludeRecentConversation({
      candidateScope: "tenant",
      currentScope: "conversation",
    })
  ).toBe(true)
  expect(
    canIncludeRecentConversation({
      candidateScope: "conversation",
      currentScope: "conversation",
    })
  ).toBe(false)
  expect(
    canIncludeRecentConversation({
      candidateScope: "person",
      currentScope: "tenant",
    })
  ).toBe(false)
  expect(
    canIncludeRecentConversation({
      candidateScope: "conversation",
      currentScope: "person",
    })
  ).toBe(true)
})
