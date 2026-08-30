import { describe, expect, test } from "vitest"
import { visibilityFromScopeInput } from "../visibility/schema"
import {
  assertExpectedVersion,
  normalizeCollectionDescription,
  normalizeCollectionName,
  normalizeExpectedVersion,
} from "./input"

describe("collection input normalization", () => {
  test("names are trimmed, required, and capped", () => {
    expect(normalizeCollectionName("  Launch tracker  ")).toBe("Launch tracker")
    expect(normalizeCollectionName("x".repeat(200))).toHaveLength(120)
    expect(() => normalizeCollectionName("   ")).toThrow("name is required")
    expect(() => normalizeCollectionName(42)).toThrow("name is required")
  })

  test("descriptions collapse to undefined when empty", () => {
    expect(normalizeCollectionDescription("  What it holds ")).toBe(
      "What it holds"
    )
    expect(normalizeCollectionDescription("   ")).toBeUndefined()
    expect(normalizeCollectionDescription(undefined)).toBeUndefined()
  })

  test("agent scope input maps onto visibility", () => {
    expect(visibilityFromScopeInput("personal")).toEqual({ mode: "private" })
    expect(visibilityFromScopeInput("organization")).toEqual({
      mode: "organization",
    })
    expect(visibilityFromScopeInput(undefined)).toEqual({
      mode: "organization",
    })
    expect(visibilityFromScopeInput("public")).toEqual({ mode: "organization" })
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
