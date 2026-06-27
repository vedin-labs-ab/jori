import { describe, expect, test } from "vitest"
import { websiteDomainKey } from "./url"

describe("websiteDomainKey", () => {
  test("compares domains without scheme or path", () => {
    expect(websiteDomainKey("https://example.com")).toBe("example.com")
    expect(websiteDomainKey("example.com")).toBe("example.com")
    expect(websiteDomainKey("http://example.com")).toBe("example.com")
    expect(websiteDomainKey("example.com/test")).toBe("example.com")
    expect(websiteDomainKey("https:/example.com")).toBe("example.com")
    expect(websiteDomainKey("https:example.com")).toBe("example.com")
  })

  test("keeps distinct subdomains distinct", () => {
    expect(websiteDomainKey("https://app.example.com")).toBe("app.example.com")
  })

  test("rejects non-public website inputs", () => {
    expect(websiteDomainKey("localhost")).toBeNull()
    expect(websiteDomainKey("https://127.0.0.1")).toBeNull()
    expect(websiteDomainKey("ftp://example.com")).toBeNull()
  })
})
