import { afterEach, expect, test, vi } from "vitest"
import { type ActionCtx } from "../../_generated/server"
import { stripeEnvironmentNames } from "./config"
import { handleStripeEvents } from "./http"

afterEach(() => vi.unstubAllEnvs())

test("unconfigured webhooks return unavailable without reading or applying an event", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "")
  const runMutation = vi.fn()
  const request = new Request("https://example.convex.site/stripe/events", {
    method: "POST",
    body: "not parsed",
  })
  const response = await handleStripeEvents(
    { runMutation } as unknown as ActionCtx,
    request
  )
  expect(response.status).toBe(503)
  expect(response.headers.get("Cache-Control")).toBe("no-store")
  expect(request.bodyUsed).toBe(false)
  expect(runMutation).not.toHaveBeenCalled()
})

test("configured billing still rejects unsigned webhook events", async () => {
  for (const name of stripeEnvironmentNames) {
    vi.stubEnv(name, "configured-test-value")
  }
  const runMutation = vi.fn()
  const response = await handleStripeEvents(
    { runMutation } as unknown as ActionCtx,
    new Request("https://example.convex.site/stripe/events", {
      method: "POST",
      body: "{}",
    })
  )
  expect(response.status).toBe(400)
  expect(runMutation).not.toHaveBeenCalled()
})
