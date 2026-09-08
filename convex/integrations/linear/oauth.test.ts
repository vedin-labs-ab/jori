import { afterEach, expect, test, vi } from "vitest"
import { fetchLinearInstallationProfile } from "./oauth"

afterEach(() => vi.unstubAllGlobals())

test("reads the unique bot display name and canonical profile URL", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json({ data: profile() })
  )
  vi.stubGlobal("fetch", fetch)
  expect(await fetchLinearInstallationProfile("synthetic-token")).toMatchObject(
    {
      botId: "bot-eu",
      botDisplayName: "jori-production-eu",
      botUrl: "https://linear.app/vedin-labs/profiles/jori-production-eu",
    }
  )
  const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))
  expect(body.query).toMatch(/viewer\s*\{\s*id\s*name\s*displayName\s*url\s*\}/)
})

test.each([
  "displayName",
  "url",
])("rejects a missing bot %s instead of inventing identity", async (field) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        data: { ...profile(), viewer: { ...profile().viewer, [field]: "" } },
      })
    )
  )
  await expect(
    fetchLinearInstallationProfile("synthetic-token")
  ).rejects.toThrow("Could not read Linear installation profile")
})

function profile() {
  return {
    viewer: {
      id: "bot-eu",
      name: "Not a unique identity",
      displayName: "jori-production-eu",
      url: "https://linear.app/vedin-labs/profiles/jori-production-eu",
    },
    organization: { id: "workspace", name: "Test", urlKey: "vedin-labs" },
  }
}
