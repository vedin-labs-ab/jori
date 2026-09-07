import { type ChatRequest } from "@openrouter/sdk/models"
import { expect, test } from "vitest"
import { withSupportedTokenBudget } from "./request"

const request: ChatRequest = { model: "model", messages: [], maxTokens: 4096 }
const completion = { supportedParameters: ["max_completion_tokens" as const] }
const tokens = { supportedParameters: ["max_tokens" as const] }

test("translates the common output budget to the model's supported parameter", () => {
  expect(withSupportedTokenBudget(request, [completion])).toEqual({
    ...request,
    maxTokens: undefined,
    maxCompletionTokens: 4096,
  })
  expect(withSupportedTokenBudget(request, [tokens])).toEqual({
    ...request,
    maxCompletionTokens: undefined,
  })
})
test("never drops a budget or silently chooses one for conflicting candidates", () => {
  expect(() => withSupportedTokenBudget(request, [completion, tokens])).toThrow(
    "do not share"
  )
  expect(() =>
    withSupportedTokenBudget({ ...request, maxCompletionTokens: 1024 }, [
      completion,
    ])
  ).toThrow("one output token budget")
})
test("requests without an explicit budget remain unchanged", () => {
  const unbounded = { model: "model", messages: [] }
  expect(withSupportedTokenBudget(unbounded, [completion])).toBe(unbounded)
})
