import { describe, expect, test } from "vitest"
import {
  clampShareExpiryHours,
  parseShareFragment,
  shareExpiresAt,
  shareExpiry,
  shareFragment,
  viewFragment,
} from "./share"

describe("share fragment", () => {
  test("round-trips a secret through the fragment", () => {
    const fragment = shareFragment("a1b2c3")

    expect(fragment).toBe("share=a1b2c3")
    expect(parseShareFragment(fragment)).toBe("a1b2c3")
    expect(parseShareFragment(`#${fragment}`)).toBe("a1b2c3")
  })

  test("encodes secrets that need escaping", () => {
    expect(parseShareFragment(shareFragment("a+b/c="))).toBe("a+b/c=")
  })

  test("returns null for absent or empty secrets", () => {
    expect(parseShareFragment("")).toBeNull()
    expect(parseShareFragment("#")).toBeNull()
    expect(parseShareFragment("#share=")).toBeNull()
    expect(parseShareFragment("#other=value")).toBeNull()
  })
})

describe("view fragment", () => {
  test("keeps view params and drops the secret", () => {
    expect(viewFragment("#share=s3cret&d=2026-07-14&m=evt_1")).toBe(
      "d=2026-07-14&m=evt_1"
    )
    expect(viewFragment("d=2026-07-14")).toBe("d=2026-07-14")
  })

  test("returns null when only the secret or nothing is present", () => {
    expect(viewFragment("#share=s3cret")).toBeNull()
    expect(viewFragment("")).toBeNull()
    expect(viewFragment("#")).toBeNull()
  })
})

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
