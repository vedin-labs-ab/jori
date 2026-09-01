import { describe, expect, test } from "vitest"
import { visibilityFromInput } from "../visibility/schema"
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

  test("agent visibility input maps onto stored visibility", () => {
    expect(visibilityFromInput("private")).toEqual({ mode: "private" })
    expect(visibilityFromInput("organization")).toEqual({
      mode: "organization",
    })
    expect(visibilityFromInput(undefined)).toEqual({
      mode: "organization",
    })
    // Anything an agent invents that is not "private" lands on the
    // organization, the only other audience it can ask for.
    expect(visibilityFromInput("everyone")).toEqual({ mode: "organization" })
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
