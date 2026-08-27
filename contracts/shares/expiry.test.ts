import { describe, expect, test } from "vitest"
import { clampShareExpiryHours, shareExpiresAt, shareExpiry } from "./expiry"

describe("share expiry", () => {
  test("defaults when hours are absent or invalid", () => {
    expect(clampShareExpiryHours(undefined)).toBe(shareExpiry.defaultHours)
    expect(clampShareExpiryHours(Number.NaN)).toBe(shareExpiry.defaultHours)
  })

  test("clamps hours to the allowed range", () => {
    expect(clampShareExpiryHours(0)).toBe(shareExpiry.minHours)
    expect(clampShareExpiryHours(-5)).toBe(shareExpiry.minHours)
    expect(clampShareExpiryHours(9000)).toBe(shareExpiry.maxHours)
    expect(clampShareExpiryHours(24)).toBe(24)
  })

  test("computes an absolute expiry from now", () => {
    expect(shareExpiresAt(1000, 2)).toBe(1000 + 2 * 60 * 60 * 1000)
    expect(shareExpiresAt(1000)).toBe(
      1000 + shareExpiry.defaultHours * 60 * 60 * 1000
    )
  })
})
