import { expect, test } from "vitest"
import { canIncludeRecentConversation } from "./scope"

test("includes tenant recency everywhere", () => {
  expect(
    canIncludeRecentConversation({
      candidateScope: "tenant",
      currentScope: "conversation",
      personal: false,
    })
  ).toBe(true)
  expect(
    canIncludeRecentConversation({
      candidateScope: "tenant",
      currentScope: undefined,
      personal: false,
    })
  ).toBe(true)
})

test("includes narrower recency only in the person's own person-scoped run", () => {
  expect(
    canIncludeRecentConversation({
      candidateScope: "conversation",
      currentScope: "person",
      personal: true,
    })
  ).toBe(true)
  expect(
    canIncludeRecentConversation({
      candidateScope: "person",
      currentScope: "person",
      personal: true,
    })
  ).toBe(true)
})

test("excludes narrower recency for other scopes and other persons", () => {
  expect(
    canIncludeRecentConversation({
      candidateScope: "conversation",
      currentScope: "conversation",
      personal: true,
    })
  ).toBe(false)
  expect(
    canIncludeRecentConversation({
      candidateScope: "person",
      currentScope: "tenant",
      personal: true,
    })
  ).toBe(false)
  expect(
    canIncludeRecentConversation({
      candidateScope: "conversation",
      currentScope: "person",
      personal: false,
    })
  ).toBe(false)
})
