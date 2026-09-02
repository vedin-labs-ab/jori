import { expect, test } from "vitest"
import { conflictMessage, isVersionConflict } from "./conflict"

test("recognizes the backend's optimistic-version rejection", () => {
  const error = new Error(
    "Row version conflict: expected 2, found 3. Re-read before writing."
  )

  expect(isVersionConflict(error)).toBe(true)
})

test("ignores other errors and non-errors", () => {
  expect(isVersionConflict(new Error("Table not found."))).toBe(false)
  expect(isVersionConflict("version conflict")).toBe(false)
})

test("names the thing that conflicted", () => {
  expect(conflictMessage("row")).toContain("row")
})
