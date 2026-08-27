import { describe, expect, test } from "vitest"
import {
  assertExpectedVersion,
  normalizeExpectedVersion,
  normalizeMaterialDescription,
  normalizeMaterialName,
  normalizeMaterialScope,
} from "./input"

describe("material input normalization", () => {
  test("names are trimmed, required, and capped", () => {
    expect(normalizeMaterialName("  Launch tracker  ")).toBe("Launch tracker")
    expect(normalizeMaterialName("x".repeat(200))).toHaveLength(120)
    expect(() => normalizeMaterialName("   ")).toThrow("name is required")
    expect(() => normalizeMaterialName(42)).toThrow("name is required")
  })

  test("descriptions collapse to undefined when empty", () => {
    expect(normalizeMaterialDescription("  What it holds ")).toBe(
      "What it holds"
    )
    expect(normalizeMaterialDescription("   ")).toBeUndefined()
    expect(normalizeMaterialDescription(undefined)).toBeUndefined()
  })

  test("scope defaults to organization", () => {
    expect(normalizeMaterialScope("personal")).toBe("personal")
    expect(normalizeMaterialScope("organization")).toBe("organization")
    expect(normalizeMaterialScope(undefined)).toBe("organization")
    expect(normalizeMaterialScope("public")).toBe("organization")
  })

  test("expected versions are truncated non-negative integers", () => {
    expect(normalizeExpectedVersion(3.9)).toBe(3)
    expect(normalizeExpectedVersion(-1)).toBe(0)
    expect(normalizeExpectedVersion("3")).toBeUndefined()
    expect(normalizeExpectedVersion(undefined)).toBeUndefined()
  })
})

describe("assertExpectedVersion", () => {
  test("passes without an expectation or on a match", () => {
    expect(() => assertExpectedVersion(undefined, 7, "Store")).not.toThrow()
    expect(() => assertExpectedVersion(7, 7, "Store")).not.toThrow()
  })

  test("rejects stale expectations", () => {
    expect(() => assertExpectedVersion(6, 7, "Store demo")).toThrow(
      "Store demo version conflict: expected 6, found 7"
    )
  })
})
