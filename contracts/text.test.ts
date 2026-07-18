import { describe, expect, test } from "vitest"
import { collapseWhitespace } from "./text"

describe("collapseWhitespace", () => {
  test("collapses runs of any whitespace to single spaces", () => {
    expect(collapseWhitespace("one\t\ttwo\n\nthree   four")).toBe(
      "one two three four"
    )
  })

  test("trims the ends", () => {
    expect(collapseWhitespace("  padded  ")).toBe("padded")
    expect(collapseWhitespace(" \n\t ")).toBe("")
  })
})
