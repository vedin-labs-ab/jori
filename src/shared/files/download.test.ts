import { describe, expect, test } from "vitest"
import { toFilename } from "./download"

describe("toFilename", () => {
  test("appends the extension to the name", () => {
    expect(toFilename("Launch plan", "json")).toBe("Launch plan.json")
  })

  test("replaces characters unsafe in filenames", () => {
    expect(toFilename("a/b\\c:d", "csv")).toBe("a-b-c-d.csv")
  })
})
