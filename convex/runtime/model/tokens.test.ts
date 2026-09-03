import { describe, expect, test } from "vitest"
import { readModelTokens } from "./tokens"

describe("model tokens", () => {
  test("normalizes OpenRouter token cache accounting", () => {
    expect(
      readModelTokens({
        completionTokens: 100,
        completionTokensDetails: { reasoningTokens: 25 },
        promptTokens: 2000,
        promptTokensDetails: { cacheWriteTokens: 300, cachedTokens: 1500 },
        totalTokens: 2100,
      })
    ).toEqual({
      cacheRead: 1500,
      cacheWrite: 300,
      input: 2000,
      output: 100,
      reasoning: 25,
      total: 2100,
      uncached: 500,
    })
  })

  test("treats missing details as no cache and no reasoning", () => {
    expect(
      readModelTokens({
        completionTokens: 10,
        completionTokensDetails: null,
        promptTokens: 20,
        promptTokensDetails: null,
        totalTokens: 30,
      })
    ).toEqual({
      cacheRead: 0,
      cacheWrite: 0,
      input: 20,
      output: 10,
      reasoning: 0,
      total: 30,
      uncached: 20,
    })
  })

  test("returns zero defaults when the model reports no usage", () => {
    expect(readModelTokens(undefined)).toEqual({
      cacheRead: 0,
      cacheWrite: 0,
      input: 0,
      output: 0,
      reasoning: 0,
      total: 0,
      uncached: 0,
    })
  })
})
