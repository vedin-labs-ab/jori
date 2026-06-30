import { describe, expect, test } from "vitest"
import { readModelUsage } from "./usage"

describe("model usage", () => {
  test("normalizes AI SDK token cache accounting", () => {
    expect(
      readModelUsage({
        usage: {
          inputTokenDetails: {
            cacheReadTokens: 1500,
            cacheWriteTokens: 400,
            noCacheTokens: 500,
          },
          inputTokens: 2000,
          outputTokenDetails: {
            reasoningTokens: 25,
          },
          outputTokens: 100,
          totalTokens: 2100,
        },
      })
    ).toEqual({
      inputCacheReadTokens: 1500,
      inputCacheWriteTokens: 400,
      inputTokens: 2000,
      inputUncachedTokens: 500,
      outputTokens: 100,
      reasoningTokens: 25,
      totalTokens: 2100,
    })
  })

  test("drops missing and invalid usage values", () => {
    expect(
      readModelUsage({
        usage: {
          inputTokenDetails: {
            cacheReadTokens: Number.NaN,
            noCacheTokens: "10",
          },
          inputTokens: 10,
        },
      })
    ).toEqual({
      inputCacheReadTokens: 0,
      inputCacheWriteTokens: 0,
      inputTokens: 10,
      inputUncachedTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
    })
  })

  test("returns zero defaults when no usage values are present", () => {
    const empty = {
      inputCacheReadTokens: 0,
      inputCacheWriteTokens: 0,
      inputTokens: 0,
      inputUncachedTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
    }

    expect(readModelUsage({ usage: {} })).toEqual(empty)
    expect(readModelUsage({})).toEqual(empty)
  })
})
