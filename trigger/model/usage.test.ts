import { describe, expect, test } from "vitest"
import { readModelTokens } from "./usage"

describe("model usage", () => {
  test("normalizes AI SDK token cache accounting", () => {
    expect(
      readModelTokens({
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
      cacheRead: 1500,
      cacheWrite: 400,
      input: 2000,
      output: 100,
      reasoning: 25,
      total: 2100,
      uncached: 500,
    })
  })

  test("drops missing and invalid usage values", () => {
    expect(
      readModelTokens({
        usage: {
          inputTokenDetails: {
            cacheReadTokens: Number.NaN,
            noCacheTokens: "10",
          },
          inputTokens: 10,
        },
      })
    ).toEqual({
      cacheRead: 0,
      cacheWrite: 0,
      input: 10,
      output: 0,
      reasoning: 0,
      total: 0,
      uncached: 0,
    })
  })

  test("returns zero defaults when no usage values are present", () => {
    const empty = {
      cacheRead: 0,
      cacheWrite: 0,
      input: 0,
      output: 0,
      reasoning: 0,
      total: 0,
      uncached: 0,
    }

    expect(readModelTokens({ usage: {} })).toEqual(empty)
    expect(readModelTokens({})).toEqual(empty)
  })
})
