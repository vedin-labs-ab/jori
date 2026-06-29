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
      inputTokens: 10,
    })
  })

  test("returns undefined when no usage values are present", () => {
    expect(readModelUsage({ usage: {} })).toBeUndefined()
    expect(readModelUsage({})).toBeUndefined()
  })
})
