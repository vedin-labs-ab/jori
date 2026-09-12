import { afterEach, expect, test, vi } from "vitest"
import { slackQueryApi } from "./api"

afterEach(() => {
  vi.unstubAllGlobals()
})

test.each([
  [
    503,
    JSON.stringify({ error: "unavailable", privateContent: "customer-secret" }),
    "HTTP 503",
  ],
  [
    200,
    JSON.stringify({
      ok: false,
      error: "invalid_auth",
      privateContent: "customer-secret",
    }),
    "invalid_auth",
  ],
  [200, "customer-secret", "invalid JSON response"],
])(
  "Slack API failures keep response content out of exceptions",
  async (status, body, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(body, { status }))
    )
    await expect(slackQueryApi("test-token", "auth.test", {})).rejects.toThrow(
      `Slack API request failed: ${message}`
    )
  }
)
