import { expect, test } from "vitest"
import { chatSuggestionPool, rotateSuggestions } from "./suggestions"

test("rotates the pool from a start, wrapping, and every ask keeps its icon", () => {
  const rotated = rotateSuggestions(
    chatSuggestionPool,
    chatSuggestionPool.length + 2
  )

  expect(rotated).toHaveLength(chatSuggestionPool.length)
  expect(rotated[0]).toBe(chatSuggestionPool[2])
  expect(rotated.at(-1)).toBe(chatSuggestionPool[1])
  expect(rotateSuggestions([], 3)).toEqual([])
  expect(new Set(chatSuggestionPool.map(({ text }) => text)).size).toBe(
    chatSuggestionPool.length
  )
})
