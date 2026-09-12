import { expect, test } from "vitest"
import { countMatches, scanPage } from "./index"

async function* numbers(count: number) {
  for (let number = 1; number <= count; number += 1) {
    yield number
  }
}

test("a page holds the matches past the offset, and the cursor is the count served", async () => {
  const built: number[] = []
  const scan = {
    match: async (number: number) => (number % 2 === 0 ? {} : null),
    row: async (number: number) => {
      built.push(number)

      return `row ${number}`
    },
  }

  expect(
    await scanPage(numbers(10), { ...scan, offset: 1, numItems: 2 })
  ).toEqual({
    continueCursor: "3",
    isDone: false,
    page: ["row 4", "row 6"],
  })
  // A skipped match is never built; only the served ones are.
  expect(built).toEqual([4, 6])
  expect(
    await scanPage(numbers(10), { ...scan, offset: 3, numItems: 5 })
  ).toEqual({
    continueCursor: "5",
    isDone: true,
    page: ["row 8", "row 10"],
  })
})

test("a row the match had to build is kept rather than built again", async () => {
  const scan = {
    match: async (number: number) => ({ row: `matched ${number}` }),
    row: async () => {
      throw new Error("built twice")
    },
  }

  expect(
    await scanPage(numbers(2), { ...scan, offset: 0, numItems: 5 })
  ).toEqual({
    continueCursor: "2",
    isDone: true,
    page: ["matched 1", "matched 2"],
  })
  expect(await countMatches(numbers(6), async (number) => number > 4)).toBe(2)
})
