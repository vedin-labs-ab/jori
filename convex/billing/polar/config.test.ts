import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { polarRequest } from "./client"
import {
  isPolarConfigured,
  polarEnvironmentNames,
  polarMetadata,
  requirePolarConfiguration,
} from "./config"

beforeEach(() => {
  for (const name of polarEnvironmentNames) {
    vi.stubEnv(name, "configured-test-value")
  }
  vi.stubEnv("POLAR_SERVER", "sandbox")
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test("billing readiness requires the server, credentials, webhook verification and both products", () => {
  expect(polarEnvironmentNames).toEqual([
    "POLAR_SERVER",
    "POLAR_ACCESS_TOKEN",
    "POLAR_WEBHOOK_SECRET",
    "POLAR_PRODUCT_CLOUD",
    "POLAR_PRODUCT_TOP_UP",
  ])
  expect(isPolarConfigured()).toBe(true)
  expect(() => requirePolarConfiguration()).not.toThrow()
})

test.each(polarEnvironmentNames)(
  "missing %s disables every Polar request",
  async (name) => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    vi.stubEnv(name, "  ")
    expect(isPolarConfigured()).toBe(false)
    await expect(polarRequest("/v1/orders/")).rejects.toThrow(
      "Billing is not available in this instance yet."
    )
    expect(fetch).not.toHaveBeenCalled()
  }
)

test("an unconfigured instance cannot use another region's configuration", () => {
  for (const name of polarEnvironmentNames) {
    vi.stubEnv(name, "")
    vi.stubEnv(`${name}_US`, "other-region-value")
  }
  expect(isPolarConfigured()).toBe(false)
})

test.each([400, 401, 429, 503])(
  "Polar HTTP %s errors omit reflected provider content without retrying",
  async (status) => {
    const fetch = vi.fn(async () =>
      Response.json(
        { error: { message: "Reflected private customer value" } },
        { status }
      )
    )
    vi.stubGlobal("fetch", fetch)
    await expect(polarRequest("/v1/orders/")).rejects.toThrow(
      `Polar request failed (HTTP ${status})`
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  }
)

test("malformed successful Polar responses cannot expose parser snippets", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("Private value"))
  )
  await expect(polarRequest("/v1/orders/")).rejects.toThrow(
    "Polar returned invalid JSON"
  )
})

test("requests go to the configured server with a pinned API version", async () => {
  const fetch = vi.fn(async () => Response.json({}))
  vi.stubGlobal("fetch", fetch)
  await polarRequest("/v1/orders/", {
    query: { status: ["open", "confirmed"] },
  })
  const [url, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit]
  expect(url.toString()).toBe(
    "https://sandbox-api.polar.sh/v1/orders/?status=open&status=confirmed"
  )
  expect(init.headers).toMatchObject({ "polar-version": "2026-10" })
})

test("an unknown server never falls back to production", async () => {
  vi.stubEnv("POLAR_SERVER", "live")
  await expect(polarRequest("/v1/orders/")).rejects.toThrow(
    "POLAR_SERVER must be sandbox or production."
  )
})

test("metadata cannot override the deployment region", () => {
  vi.stubEnv("JORI_REGION", "eu")
  expect(
    polarMetadata({ region: "us", organizationId: "organization-1" })
  ).toEqual({ region: "eu", organizationId: "organization-1" })
})

test("subscription changes send the JSON patch body and preserve the pinned API contract", async () => {
  const fetch = vi.fn(async () => Response.json({}))
  vi.stubGlobal("fetch", fetch)
  await polarRequest("/v1/subscriptions/storage-test", {
    method: "PATCH",
    body: { units: 40, proration_behavior: "invoice" },
  })
  const [, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit]
  expect(init.method).toBe("PATCH")
  expect(init.headers).toMatchObject({
    "content-type": "application/json",
    "polar-version": "2026-10",
  })
  expect(JSON.parse(String(init.body))).toEqual({
    units: 40,
    proration_behavior: "invoice",
  })
})
