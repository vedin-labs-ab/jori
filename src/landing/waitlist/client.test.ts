import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { joinWaitlist, waitlistSite } from "./client"

vi.mock("@/shared/region/config", () => ({
  regionConfig: { current: "eu", enabled: new Set(["eu", "us"]) },
}))

const input = {
  company: "",
  email: "synthetic@example.test",
  size: "10-24",
  work: "Synthetic test",
}
const fetcher = vi.fn(async () => Response.json({ status: "joined" }))

beforeEach(() => {
  vi.stubGlobal("fetch", fetcher)
  vi.stubEnv(
    "VITE_JORI_EU_SITE_URL",
    "https://eu-deployment.eu-west-1.convex.site"
  )
  vi.stubEnv("VITE_JORI_US_SITE_URL", "https://us-deployment.convex.site")
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

test.each([
  "eu",
  "us",
] as const)("posts %s waitlist data directly without cookies or a relay", async (region) => {
  await expect(joinWaitlist(input, region)).resolves.toEqual({
    status: "joined",
  })
  expect(fetcher).toHaveBeenCalledExactlyOnceWith(
    `${waitlistSite(region)}/waitlist`,
    {
      method: "POST",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }
  )
})

test("fails before sending form data if the selected production API is missing", async () => {
  vi.stubEnv("DEV", false)
  vi.stubEnv("VITE_JORI_US_SITE_URL", "")
  await expect(joinWaitlist(input, "us")).rejects.toThrow(
    "Missing VITE_JORI_US_SITE_URL"
  )
  expect(fetcher).not.toHaveBeenCalled()
})

test("rejects arbitrary network destinations", async () => {
  vi.stubEnv("VITE_JORI_EU_SITE_URL", "https://attacker.example")
  await expect(joinWaitlist(input, "eu")).rejects.toThrow(
    "Convex HTTPS site origin"
  )
  expect(fetcher).not.toHaveBeenCalled()
})
