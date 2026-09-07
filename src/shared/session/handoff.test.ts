import { afterEach, expect, test, vi } from "vitest"
import { handleIntegrationCallback } from "./handoff"

afterEach(() => vi.unstubAllGlobals())
const options = {
  siteUrl: "https://eu.convex.site",
  getToken: async () => "session-token",
}

test("only proxies allowlisted callbacks to the configured region", async () => {
  const fetchMock = vi.fn<typeof fetch>(
    async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://eu.jori.app/integrations" },
      })
  )
  vi.stubGlobal("fetch", fetchMock)
  const response = await handleIntegrationCallback(
    new Request(
      "https://eu.jori.app/api/integrations/callback?callback=/google/oauth/callback&code=code&state=state&target=https://evil.example",
      {
        headers: { cookie: "private-cookie", authorization: "Bearer attacker" },
      }
    ),
    options
  )
  expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
    "https://eu.convex.site/google/oauth/callback?code=code&state=state"
  )
  expect(fetchMock.mock.calls[0]?.[1]).toEqual({
    headers: { authorization: "Bearer session-token" },
    redirect: "manual",
    cache: "no-store",
  })
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(response.headers.get("referrer-policy")).toBe("no-referrer")
})

test.each([
  "https://evil.example",
  "/stripe/events",
  "//evil.example/google/oauth/callback",
])("rejects arbitrary forwarding: %s", async (path) => {
  const fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  const response = await handleIntegrationCallback(
    new Request(
      `https://eu.jori.app/api/integrations/callback?callback=${encodeURIComponent(path)}`
    ),
    options
  )
  expect(response.status).toBe(400)
  expect(fetchMock).not.toHaveBeenCalled()
})

test("never forwards an unauthenticated callback", async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  const response = await handleIntegrationCallback(
    new Request(
      "https://eu.jori.app/api/integrations/callback?callback=/google/oauth/callback"
    ),
    { ...options, getToken: async () => undefined }
  )
  expect(response.status).toBe(401)
  expect(fetchMock).not.toHaveBeenCalled()
})
