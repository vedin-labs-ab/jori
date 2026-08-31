import { expect, test } from "vitest"
import { canIncludeRecentConversation } from "./scope"

test("includes organization recency everywhere", () => {
  expect(
    canIncludeRecentConversation({
      candidateAudience: "organization",
      currentAudience: "conversation",
      personal: false,
    })
  ).toBe(true)
  expect(
    canIncludeRecentConversation({
      candidateAudience: "organization",
      currentAudience: undefined,
      personal: false,
    })
  ).toBe(true)
})

test("includes narrower recency only in the person's own person-scoped run", () => {
  expect(
    canIncludeRecentConversation({
      candidateAudience: "conversation",
      currentAudience: "person",
      personal: true,
    })
  ).toBe(true)
  expect(
    canIncludeRecentConversation({
      candidateAudience: "person",
      currentAudience: "person",
      personal: true,
    })
  ).toBe(true)
})

test("excludes narrower recency for other scopes and other persons", () => {
  expect(
    canIncludeRecentConversation({
      candidateAudience: "conversation",
      currentAudience: "conversation",
      personal: true,
    })
  ).toBe(false)
  expect(
    canIncludeRecentConversation({
      candidateAudience: "person",
      currentAudience: "organization",
      personal: true,
    })
  ).toBe(false)
  expect(
    canIncludeRecentConversation({
      candidateAudience: "conversation",
      currentAudience: "person",
      personal: false,
    })
  ).toBe(false)
})
