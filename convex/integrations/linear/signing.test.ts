import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { hmacSha256Hex } from "../../shared/crypto"
import { verifyLinearRequest } from "./signing"

beforeEach(() => {
  vi.stubEnv("LINEAR_WEBHOOK_SECRET", "synthetic-linear-eu-secret")
  vi.useFakeTimers()
  vi.setSystemTime(Date.parse("2026-09-09T12:00:00Z"))
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

test("accepts a current signed event and rejects forged or other-region signatures", async () => {
  const body = JSON.stringify({
    webhookTimestamp: Date.now(),
    organizationId: "workspace",
  })
  expect(await verifyLinearRequest(await request(body), body)).toBe(true)
  expect(
    await verifyLinearRequest(
      await request(body, "synthetic-linear-us-secret"),
      body
    )
  ).toBe(false)
  expect(
    await verifyLinearRequest(
      await request(body),
      body.replace("workspace", "other")
    )
  ).toBe(false)
})

test.each([
  -60_001,
  60_001,
  undefined,
])("rejects signed stale, future or missing delivery timestamps (%s)", async (offset) => {
  const body = JSON.stringify({
    webhookTimestamp: offset === undefined ? undefined : Date.now() + offset,
  })
  expect(await verifyLinearRequest(await request(body), body)).toBe(false)
})

test("does not trust an unsigned timestamp header or malformed payload", async () => {
  const body = JSON.stringify({ webhookTimestamp: Date.now() - 120_000 })
  const signed = await request(body)
  signed.headers.set("linear-timestamp", String(Date.now()))
  expect(await verifyLinearRequest(signed, body)).toBe(false)
  expect(await verifyLinearRequest(await request("not-json"), "not-json")).toBe(
    false
  )
})

async function request(body: string, secret = "synthetic-linear-eu-secret") {
  return new Request("https://example.com/linear/events", {
    method: "POST",
    headers: { "linear-signature": await hmacSha256Hex(secret, body) },
    body,
  })
}
