import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { handleWaitlistPreflight } from "./http"

beforeEach(() => {
  vi.stubEnv("JORI_APP_URL", "https://eu.usejori.com")
  vi.stubEnv("JORI_PUBLIC_ORIGIN", "https://usejori.com")
})
afterEach(() => vi.unstubAllEnvs())

test.each(["https://usejori.com", "https://eu.usejori.com"])(
  "allows waitlist-only CORS from %s",
  (origin) => {
    const response = handleWaitlistPreflight(
      new Request("https://regional.convex.site/waitlist", {
        headers: { origin },
      })
    )
    expect(response.headers.get("access-control-allow-origin")).toBe(origin)
    expect(response.headers.get("access-control-allow-credentials")).toBeNull()
  }
)

test.each(["https://us.usejori.com", "https://attacker.example", "null"])(
  "does not grant CORS to %s",
  (origin) => {
    const response = handleWaitlistPreflight(
      new Request("https://regional.convex.site/waitlist", {
        headers: { origin },
      })
    )
    expect(response.headers.get("access-control-allow-origin")).toBeNull()
  }
)
