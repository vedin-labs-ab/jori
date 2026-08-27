import { describe, expect, test } from "vitest"
import { parseShareFragment, shareFragment } from "./fragment"

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
