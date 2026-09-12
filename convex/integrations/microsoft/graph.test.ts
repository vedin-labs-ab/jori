import { afterEach, expect, test, vi } from "vitest"
import { microsoftGraphJson } from "./graph"

afterEach(() => vi.unstubAllGlobals())

test.each([
  401, 403, 429, 500,
])("Graph HTTP %s reports status without response content or retries", async (status) => {
  const fetch = vi.fn(async () =>
    Response.json({ error: { code: "SyntheticFailure" } }, { status })
  )
  vi.stubGlobal("fetch", fetch)

  await expect(
    microsoftGraphJson("fixture-token", "/me/sendMail", {
      method: "POST",
      body: { message: {} },
    })
  ).rejects.toThrow(`Provider API request failed (HTTP ${status})`)
  expect(fetch).toHaveBeenCalledTimes(1)
})
