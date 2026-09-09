import { getFunctionName } from "convex/server"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { hmacSha256Hex } from "../../shared/crypto"
import { handleSlackEvents, handleSlackInteractions } from "./http"

beforeEach(() => {
  vi.stubEnv("SLACK_SIGNING_SECRET", "test-signing-secret")
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const event = {
  type: "event_callback",
  team_id: "TTEST",
  event_id: "EvTEST",
  token: "obsolete-verification-token",
  event: {
    type: "app_mention",
    user: "UTEST",
    channel: "CTEST",
    text: "<@UBOT> hello",
    ts: "1710000000.000200",
  },
}

test("Slack rejects forged events before any regional write", async () => {
  const runMutation = vi.fn()
  const response = await handleSlackEvents(
    { runMutation } as unknown as ActionCtx,
    new Request("https://jori.example/slack/events", {
      method: "POST",
      body: JSON.stringify(event),
    })
  )
  expect(response.status).toBe(401)
  expect(runMutation).not.toHaveBeenCalled()
})

test("Slack acknowledges only after durable acceptance, without profile or channel requests", async () => {
  const runMutation = vi.fn().mockResolvedValue({ status: "accepted" })
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  const response = await handleSlackEvents(
    { runMutation } as unknown as ActionCtx,
    await signedRequest(JSON.stringify(event))
  )
  expect(response.status).toBe(200)
  expect(getFunctionName(runMutation.mock.calls[0]?.[0])).toBe(
    getFunctionName(internal.integrations.webhooks.delivery.accept)
  )
  expect(runMutation.mock.calls[0]?.[1]).toMatchObject({
    provider: "slack",
    externalId: "TTEST",
    eventId: "EvTEST",
    payload: { kind: "event", event: { event: event.event } },
  })
  expect(runMutation.mock.calls[0]?.[1].payload.event).not.toHaveProperty(
    "token"
  )
  expect(fetch).not.toHaveBeenCalled()
})

test("failed durable acceptance is not acknowledged as successful delivery", async () => {
  const runMutation = vi
    .fn()
    .mockRejectedValue(new Error("database unavailable"))
  await expect(
    handleSlackEvents(
      { runMutation } as unknown as ActionCtx,
      await signedRequest(JSON.stringify(event))
    )
  ).rejects.toThrow("database unavailable")
})

test("signed malformed Slack events receive a client error", async () => {
  const runMutation = vi.fn()
  const response = await handleSlackEvents(
    { runMutation } as unknown as ActionCtx,
    await signedRequest(JSON.stringify({ ...event, event: null }))
  )
  expect(response.status).toBe(400)
  expect(runMutation).not.toHaveBeenCalled()
})

test("Slack block actions are queued with a signed-payload fingerprint and without callback secrets", async () => {
  const runMutation = vi.fn().mockResolvedValue({ status: "accepted" })
  const payload = JSON.stringify({
    type: "block_actions",
    team: { id: "TTEST" },
    user: { id: "UTEST" },
    channel: { id: "CTEST" },
    message: { ts: "1710000000.000200" },
    actions: [
      { action_id: "jori_approval_approve", value: '{"code":"ABC12345"}' },
    ],
    token: "obsolete-token",
    response_url: "https://hooks.slack.com/private-callback",
  })
  const body = new URLSearchParams({ payload }).toString()
  const response = await handleSlackInteractions(
    { runMutation } as unknown as ActionCtx,
    await signedRequest(body)
  )
  expect(response.status).toBe(200)
  const accepted = runMutation.mock.calls[0]?.[1]
  expect(accepted).toMatchObject({
    provider: "slack",
    eventId: expect.stringMatching(/^interaction:[a-f0-9]{64}$/),
  })
  expect(accepted.payload.interaction).not.toHaveProperty("token")
  expect(accepted.payload.interaction).not.toHaveProperty("response_url")
})

async function signedRequest(body: string) {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = `v0=${await hmacSha256Hex("test-signing-secret", `v0:${timestamp}:${body}`)}`
  return new Request("https://jori.example/slack/events", {
    method: "POST",
    body,
    headers: {
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": signature,
    },
  })
}
