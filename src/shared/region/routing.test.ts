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
    eu: "https://eu.jori.example",
    us: "https://us.jori.example",
  },
  publicOrigin: "https://jori.example",
}

test("leaves the current regional console host alone", () => {
  const response = handleRegionRequest(
    new Request("https://us.jori.example/chat/private?filter=customer"),
    config
  )

  expect(response).toBeNull()
})

test("keeps marketing on the apex regardless of the remembered region", () => {
  const response = handleRegionRequest(
    new Request("https://jori.example/pricing?plan=team", {
      headers: { cookie: "jori_region=eu" },
    }),
    config
  )

  expect(response).toBeNull()
})

test("estimates Europe and persists the routing preference", () => {
  const response = handleRegionRequest(
    new Request("https://jori.example/sign-in", {
      headers: { "x-vercel-ip-country": "SE" },
    }),
    config
  )

  expect(response?.headers.get("location")).toBe(
    "https://eu.jori.example/sign-in"
  )
  expect(response?.headers.get("set-cookie")).toContain("jori_region=eu")
  expect(response?.headers.get("cache-control")).toBe("private, no-store")
})

test("falls back to the deployment region when EU is disabled", () => {
  const response = handleRegionRequest(
    new Request("https://jori.example/sign-in", {
      headers: { "cf-ipcountry": "DE" },
    }),
    { ...config, enabled: new Set(["us"]) }
  )

  expect(response?.headers.get("location")).toBe(
    "https://us.jori.example/sign-in"
  )
})

test("changes regions through the apex without transferring instance data", () => {
  const selection = regionSelectionUrl(config, "eu")
  const response = handleRegionRequest(new Request(selection), config)

  expect(response?.headers.get("location")).toBe(
    "https://eu.jori.example/sign-in"
  )
  expect(response?.headers.get("set-cookie")).toContain("jori_region=eu")
})

test("does not create links to disabled regions", () => {
  expect(() =>
    regionSelectionUrl({ ...config, enabled: new Set(["us"]) }, "eu")
  ).toThrow("Region eu is not available.")
})

test("sends the www spelling to the public origin", () => {
  const response = handleRegionRequest(
    new Request("https://www.jori.example/pricing?plan=team"),
    config
  )

  expect(response?.status).toBe(308)
  expect(response?.headers.get("location")).toBe("https://jori.example/pricing")
})

test("sends the www spelling on behind a deployment proxy", () => {
  const response = handleRegionRequest(
    new Request("http://internal.service/pricing", {
      headers: { "x-forwarded-host": "www.jori.example" },
    }),
    config
  )

  expect(response?.status).toBe(308)
  expect(response?.headers.get("location")).toBe("https://jori.example/pricing")
})

test("does not treat a www regional host as the public origin", () => {
  const response = handleRegionRequest(
    new Request("https://www.eu.jori.example/console"),
    config
  )

  expect(response?.status).toBe(421)
})

test("rejects requests delivered to the wrong deployment", () => {
  const response = handleRegionRequest(
    new Request("https://eu.jori.example/console"),
    config
  )

  expect(response?.status).toBe(421)
})

test("uses a validated forwarded host behind a deployment proxy", () => {
  const response = handleRegionRequest(
    new Request("http://internal.service/pricing", {
      headers: { "x-forwarded-host": "jori.example" },
    }),
    config
  )

  expect(response).toBeNull()
})

test("does not forward writes from the public host", () => {
  const response = handleRegionRequest(
    new Request("https://jori.example/console", { method: "POST" }),
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
