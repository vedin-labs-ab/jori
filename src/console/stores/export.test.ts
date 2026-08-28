import { describe, expect, test } from "vitest"
import { buildJsonExport } from "./export"

describe("buildJsonExport", () => {
  test("pretty-prints with two-space indent and a trailing newline", () => {
    expect(buildJsonExport({ count: 3, tags: ["a"] })).toBe(
      '{\n  "count": 3,\n  "tags": [\n    "a"\n  ]\n}\n'
    )
  })

  test("serializes a never-written null value", () => {
    expect(buildJsonExport(null)).toBe("null\n")
  })
})
