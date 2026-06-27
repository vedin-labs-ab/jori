import { describe, expect, test } from "vitest"
import { normalizeWebsiteAddress, parseWebsiteAddress } from "./website"

describe("parseWebsiteAddress", () => {
  test("normalizes equivalent website inputs to the same domain key", () => {
    const inputs = [
      "https://example.com",
      "example.com",
      "http://example.com",
      "example.com/test",
      "https:/example.com",
      "https:example.com",
      "example.com:443/path",
    ]

    expect(inputs.map((input) => parseWebsiteAddress(input)?.key)).toEqual(
      inputs.map(() => "example.com")
    )
  })

  test("keeps distinct subdomains distinct", () => {
    expect(parseWebsiteAddress("https://app.example.com")?.key).toBe(
      "app.example.com"
    )
  })

  test("keeps non-default ports distinct", () => {
    expect(parseWebsiteAddress("example.com:8443")?.key).toBe(
      "example.com:8443"
    )
  })

  test("rejects non-public or unsupported website inputs", () => {
    expect(parseWebsiteAddress("localhost")).toBeNull()
    expect(parseWebsiteAddress("https://127.0.0.1")).toBeNull()
    expect(parseWebsiteAddress("ftp://example.com")).toBeNull()
    expect(parseWebsiteAddress("https://user:pass@example.com")).toBeNull()
  })
})

describe("normalizeWebsiteAddress", () => {
  test("returns a canonical public website origin", () => {
    expect(normalizeWebsiteAddress("https:/example.com/path")).toBe(
      "https://example.com"
    )
  })

  test("rejects invalid website inputs with a user-safe message", () => {
    expect(() => normalizeWebsiteAddress("localhost")).toThrow(
      "website must target a public website"
    )
  })
})
