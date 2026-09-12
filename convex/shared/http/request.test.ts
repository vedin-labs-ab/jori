import { afterEach, expect, test, vi } from "vitest"
import { errorDetails } from "../../runtime/trace/events"
import { fetchJson } from "./request"

afterEach(() => vi.unstubAllGlobals())

const request = {
  method: "POST",
  headers: { authorization: "Bearer synthetic-test-token" },
  body: { message: "Synthetic private message" },
}

test.each([
  [400, '{"message":"Synthetic private message"}'],
  [401, '{"token":"synthetic-test-token"}'],
  [502, "Synthetic private message: invalid upstream response"],
])("provider HTTP %s errors keep response content out of traces", async (status, body) => {
  const response = new Response(body, { status })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response))

  const error = await fetchJson("https://provider.example/api", request).catch(
    (caught: unknown) => caught
  )

  expect(error).toBeInstanceOf(Error)
  expect(errorDetails(error)).toEqual({
    error: `Provider API request failed (HTTP ${status})`,
  })
  expect(response.bodyUsed).toBe(false)
})

test("malformed successful responses keep parser snippets out of traces", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("Synthetic private message"))
  )

  const error = await fetchJson("https://provider.example/api", request).catch(
    (caught: unknown) => caught
  )

  expect(errorDetails(error)).toEqual({
    error: "Provider API returned an invalid JSON response",
  })
  expect(error).not.toHaveProperty("cause")
})

test("successful provider data and empty response defaults are preserved", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ items: ["example"], next: null }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  vi.stubGlobal("fetch", fetch)

  await expect(
    fetchJson("https://provider.example/api", request)
  ).resolves.toEqual({
    items: ["example"],
    next: null,
  })
  await expect(
    fetchJson("https://provider.example/api", request)
  ).resolves.toBeNull()
  await expect(
    fetchJson("https://provider.example/api", { ...request, emptyResponse: [] })
  ).resolves.toEqual([])
  expect(fetch).toHaveBeenCalledWith("https://provider.example/api", {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(request.body),
  })
})
