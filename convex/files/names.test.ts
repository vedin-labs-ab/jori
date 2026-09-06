import { expect, test } from "vitest"
import { normalizeFileName } from "./names"

test("normalizes stored names to a safe single path segment", () => {
  expect(normalizeFileName("  reports/q3/summary.pdf ")).toBe("summary.pdf")
  expect(normalizeFileName("multi\nline\rname.txt")).toBe("multi line name.txt")
  expect(normalizeFileName("")).toBe("file")
  expect(normalizeFileName(null)).toBe("file")
  expect(normalizeFileName("a".repeat(200))).toHaveLength(160)
})
