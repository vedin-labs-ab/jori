import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { send } from "./send"

const message = {
  to: "albin@usejori.com",
  subject: "Hello",
  html: "<p>Hi</p>",
  text: "Hi",
}
const request = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("BIRD_API_KEY", "bk_eu1_testing")
  vi.stubEnv("BIRD_WORKSPACE_ID", "ws_eu")
  vi.stubGlobal("fetch", request)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  request.mockReset()
})

test("sends transactional email with a stable key and tracking disabled", async () => {
  request.mockResolvedValue(Response.json({ id: "em_1" }, { status: 202 }))
  expect(await send("submission-1", "eu", message)).toEqual({
    kind: "accepted",
    providerId: "em_1",
  })
  const [url, options] = request.mock.calls[0]
  expect(url).toBe("https://eu1.platform.bird.com/v1/email/messages")
  expect(options?.headers).toMatchObject({ "Idempotency-Key": "submission-1" })
  expect(options?.redirect).toBe("error")
  expect(JSON.parse(String(options?.body))).toMatchObject({
    category: "transactional",
    to: [message.to],
    track_opens: false,
    track_clicks: false,
    metadata: { submission_id: "submission-1", region: "eu" },
  })
})

test("wrong-region credentials and submissions fail before any network call", async () => {
  await expect(send("id", "us", message)).rejects.toThrow(
    "different Jori region"
  )
  vi.stubEnv("BIRD_API_KEY", "bk_us1_testing")
  await expect(send("id", "eu", message)).rejects.toThrow("does not match")
  expect(request).not.toHaveBeenCalled()
})

test("handles throttling, permanent rejection, and ambiguous acceptance separately", async () => {
  request.mockResolvedValueOnce(
    new Response(null, { status: 429, headers: { "Retry-After": "120" } })
  )
  expect(await send("id", "eu", message)).toMatchObject({
    kind: "retry",
    retryAfterMs: 120_000,
  })
  request.mockResolvedValueOnce(new Response(null, { status: 422 }))
  expect(await send("id", "eu", message)).toEqual({
    kind: "failed",
    failure: "http_422",
  })
  request.mockResolvedValueOnce(Response.json({}, { status: 202 }))
  expect(await send("id", "eu", message)).toEqual({
    kind: "retry",
    failure: "invalid_acceptance",
  })
})
