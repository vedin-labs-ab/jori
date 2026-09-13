import { expect, test } from "vitest"
import { availableFolderName } from "./name"

test("automatic names use the first free sibling suffix, ignoring case", () => {
  expect(availableFolderName([])).toBe("New folder")
  expect(
    availableFolderName(["New folder", "New folder 1", "New folder 3"])
  ).toBe("New folder 2")
  expect(availableFolderName(["NEW FOLDER", "new folder 1"])).toBe(
    "New folder 2"
  )
})
