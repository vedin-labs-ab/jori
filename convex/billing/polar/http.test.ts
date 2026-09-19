import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type ActionCtx } from "../../_generated/server"
import { hmacSha256Base64 } from "../../shared/crypto"
import { base64DecodeBytes } from "../../shared/encoding"
import { polarEnvironmentNames } from "./config"
import { handlePolarEvents } from "./http"

const secret = "whsec_c2lnbmluZy1rZXktZm9yLXRlc3Rz"

beforeEach(() => {
  for (const name of polarEnvironmentNames) {
    vi.stubEnv(name, "configured-test-value")
  }
  vi.stubEnv("POLAR_SERVER", "sandbox")
  vi.stubEnv("POLAR_WEBHOOK_SECRET", secret)
  vi.stubEnv("JORI_REGION", "eu")
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test("unconfigured webhooks return unavailable without reading or applying an event", async () => {
  vi.stubEnv("POLAR_ACCESS_TOKEN", "")
  const runMutation = vi.fn()
  const request = new Request("https://example.convex.site/polar/events", {
    method: "POST",
    body: "not parsed",
  })
  const response = await handlePolarEvents(
    { runMutation } as unknown as ActionCtx,
    request
  )
  expect(response.status).toBe(503)
  expect(response.headers.get("Cache-Control")).toBe("no-store")
  expect(request.bodyUsed).toBe(false)
  expect(runMutation).not.toHaveBeenCalled()
})

test.each([
  ["unsigned", { "webhook-signature": "" }],
  ["wrongly signed", { "webhook-signature": "v1,AAAA" }],
  ["stale", { "webhook-timestamp": "1" }],
])("configured billing rejects %s webhook events", async (_name, headers) => {
  const runMutation = vi.fn()
  const response = await handlePolarEvents(
    { runMutation } as unknown as ActionCtx,
    await signed(event("order.paid"), headers)
  )
  expect(response.status).toBe(400)
  expect(runMutation).not.toHaveBeenCalled()
})

test("verifies the Standard Webhooks reference signature", async () => {
  vi.useFakeTimers({ now: 1_614_265_330_000 })
  vi.stubEnv("POLAR_WEBHOOK_SECRET", "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw")
  const deliver = async (body: string) =>
    await handlePolarEvents(
      { runMutation: vi.fn() } as unknown as ActionCtx,
      new Request("https://example.convex.site/polar/events", {
        method: "POST",
        body,
        headers: {
          "webhook-id": "msg_p5jXN8AQM9LWM0D4loKWxJek",
          "webhook-timestamp": "1614265330",
          "webhook-signature":
            "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=",
        },
      })
    )
  expect((await deliver('{"test": 2432232314}')).status).toBe(200)
  expect((await deliver('{"test": 2432232315}')).status).toBe(400)
  vi.useRealTimers()
})

test.each([
  ["order.paid", "/v1/orders/object_1", "order"],
  ["order.refunded", "/v1/orders/object_1", "order"],
  ["subscription.updated", "/v1/subscriptions/object_1", "subscription"],
  ["subscription.revoked", "/v1/subscriptions/object_1", "subscription"],
])("%s applies the object as Polar holds it now", async (type, path, key) => {
  const current = { id: "object_1", status: "current" }
  const fetch = vi.fn(async () => Response.json(current))
  vi.stubGlobal("fetch", fetch)
  const runMutation = vi.fn()
  const response = await handlePolarEvents(
    { runMutation } as unknown as ActionCtx,
    await signed(event(type))
  )
  expect(response.status).toBe(200)
  expect((fetch.mock.calls[0] as unknown as [URL])[0].pathname).toBe(path)
  expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
    [key]: current,
  })
})

test.each([
  event("order.paid", { region: "us" }),
  event("order.refunded", { region: "us" }),
  event("order.created"),
  event("customer.updated"),
])(
  "other regions and unrelated events are acknowledged without a lookup",
  async (payload) => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    const runMutation = vi.fn()
    const response = await handlePolarEvents(
      { runMutation } as unknown as ActionCtx,
      await signed(payload)
    )
    expect(response.status).toBe(200)
    expect(fetch).not.toHaveBeenCalled()
    expect(runMutation).not.toHaveBeenCalled()
  }
)

test("a failed lookup propagates so Polar retries delivery", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 503 }))
  )
  await expect(
    handlePolarEvents(
      { runMutation: vi.fn() } as unknown as ActionCtx,
      await signed(event("order.paid"))
    )
  ).rejects.toThrow("Polar request failed (HTTP 503)")
})

function event(type: string, metadata: Record<string, string> = {}) {
  return {
    type,
    data: { id: "object_1", metadata: { region: "eu", ...metadata } },
  }
}

async function signed(payload: unknown, headers: Record<string, string> = {}) {
  const body = JSON.stringify(payload)
  const timestamp =
    headers["webhook-timestamp"] ?? String(Math.floor(Date.now() / 1000))
  const signature = await hmacSha256Base64(
    base64DecodeBytes(secret.replace("whsec_", "")),
    `message_1.${timestamp}.${body}`
  )
  return new Request("https://example.convex.site/polar/events", {
    method: "POST",
    body,
    headers: {
      "webhook-id": "message_1",
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`,
      ...headers,
    },
  })
}
