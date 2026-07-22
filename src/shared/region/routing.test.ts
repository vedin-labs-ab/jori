import { describe, expect, test } from "vitest"
import { type RegionConfig } from "./config"
import {
  handleRegionRequest,
  normalizeReturnPath,
  regionSelectionUrl,
} from "./routing"

const config: RegionConfig = {
  current: "us",
  enabled: new Set(["us", "eu"]),
  origins: {
    eu: "https://eu.milo.example",
    us: "https://us.milo.example",
  },
  publicOrigin: "https://milo.example",
}

test("leaves the current regional host alone", () => {
  const response = handleRegionRequest(
    new Request("https://us.milo.example/pricing"),
    config
  )

  expect(response).toBeNull()
})

test("routes apex requests to a remembered region", () => {
  const response = handleRegionRequest(
    new Request("https://milo.example/pricing?plan=team", {
      headers: { cookie: "milo_region=eu" },
    }),
    config
  )

  expect(response?.status).toBe(307)
  expect(response?.headers.get("location")).toBe(
    "https://eu.milo.example/pricing?plan=team"
  )
  expect(response?.headers.get("set-cookie")).toBeNull()
})

test("estimates Europe and persists the routing preference", () => {
  const response = handleRegionRequest(
    new Request("https://milo.example/", {
      headers: { "x-vercel-ip-country": "SE" },
    }),
    config
  )

  expect(response?.headers.get("location")).toBe("https://eu.milo.example/")
  expect(response?.headers.get("set-cookie")).toContain("milo_region=eu")
  expect(response?.headers.get("cache-control")).toBe("private, no-store")
})

test("falls back to the deployment region when EU is disabled", () => {
  const response = handleRegionRequest(
    new Request("https://milo.example/", {
      headers: { "cf-ipcountry": "DE" },
    }),
    { ...config, enabled: new Set(["us"]) }
  )

  expect(response?.headers.get("location")).toBe("https://us.milo.example/")
})

test("changes regions through the apex and preserves a safe path", () => {
  const selection = regionSelectionUrl(config, "eu", "/pricing?plan=team")
  const response = handleRegionRequest(new Request(selection), config)

  expect(response?.headers.get("location")).toBe(
    "https://eu.milo.example/pricing?plan=team"
  )
  expect(response?.headers.get("set-cookie")).toContain("milo_region=eu")
})

test("does not create links to disabled regions", () => {
  expect(() =>
    regionSelectionUrl(
      { ...config, enabled: new Set(["us"]) },
      "eu",
      "/pricing"
    )
  ).toThrow("Region eu is not available.")
})

test("does not expose authentication on the apex", () => {
  const response = handleRegionRequest(
    new Request("https://milo.example/api/auth/get-session"),
    config
  )

  expect(response?.status).toBe(404)
})

test("rejects requests delivered to the wrong deployment", () => {
  const response = handleRegionRequest(
    new Request("https://eu.milo.example/console"),
    config
  )

  expect(response?.status).toBe(421)
})

test("uses a validated forwarded host behind a deployment proxy", () => {
  const response = handleRegionRequest(
    new Request("http://internal.service/pricing", {
      headers: { "x-forwarded-host": "milo.example" },
    }),
    config
  )

  expect(response?.headers.get("location")).toBe(
    "https://us.milo.example/pricing"
  )
})

test("does not forward writes from the public host", () => {
  const response = handleRegionRequest(
    new Request("https://milo.example/console", { method: "POST" }),
    config
  )

  expect(response?.status).toBe(421)
})

describe("regional return paths", () => {
  test("keeps relative paths and fragments", () => {
    expect(normalizeReturnPath("/pricing?plan=team#faq")).toBe(
      "/pricing?plan=team#faq"
    )
  })

  test("rejects external and recursive destinations", () => {
    expect(normalizeReturnPath("https://evil.example")).toBe("/")
    expect(normalizeReturnPath("//evil.example")).toBe("/")
    expect(normalizeReturnPath("/region/eu")).toBe("/")
  })
})
