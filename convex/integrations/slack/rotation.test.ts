import { getFunctionName } from "convex/server"
import { afterEach, expect, test, vi } from "vitest"
import { integrationDoc } from "../../../test/convex/integrations"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { prepareIntegrationForRuntime } from "../runtime"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test("spends only the stale Slack refresh token", async () => {
  stubSlackClient()
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      ok: true,
      access_token: "xoxe.xoxb-new",
      refresh_token: "xoxe-1-new",
      expires_in: 43_200,
    })
  )
  vi.stubGlobal("fetch", fetch)
  const runMutation = vi.fn().mockResolvedValue({})

  await prepareIntegrationForRuntime({ runMutation } as unknown as ActionCtx, {
    integration: slackIntegration({ staleBot: true }),
  })

  // Refresh tokens are single-use, so exchanging the still-fresh user token
  // alongside the bot's would throw away a credential nothing had spent.
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(runMutation.mock.calls[0]?.[1]).toEqual({
    integrationId: "integration",
    bot: {
      access: "xoxe.xoxb-new",
      refresh: "xoxe-1-new",
      expiresAt: expect.any(Number),
    },
  })
})

test("leaves a Slack integration untouched while both tokens are fresh", async () => {
  stubSlackClient()
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  const runMutation = vi.fn()

  await prepareIntegrationForRuntime({ runMutation } as unknown as ActionCtx, {
    integration: slackIntegration({ staleBot: false }),
  })

  expect(fetch).not.toHaveBeenCalled()
  expect(runMutation).not.toHaveBeenCalled()
})

test("marks a Slack integration expired when its refresh token is spent", async () => {
  stubSlackClient()
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ ok: false, error: "invalid_refresh_token" })
      )
  )
  const runMutation = vi.fn().mockResolvedValue(null)

  await expect(
    prepareIntegrationForRuntime({ runMutation } as unknown as ActionCtx, {
      integration: slackIntegration({ staleBot: true }),
    })
  ).rejects.toThrow("Slack access has expired and needs to be reconnected.")

  expect(getFunctionName(runMutation.mock.calls[0]?.[0])).toBe(
    getFunctionName(internal.integrations.expire.markExpired)
  )
})

function stubSlackClient() {
  vi.stubEnv("SLACK_CLIENT_ID", "slack-client")
  vi.stubEnv("SLACK_CLIENT_SECRET", "slack-secret")
}

function slackIntegration({
  staleBot,
}: {
  staleBot: boolean
}): Doc<"integrations"> {
  return integrationDoc({
    integration: "slack",
    externalId: "T123",
    credentials: {
      bot: slackTokenPair("bot", staleBot),
      user: slackTokenPair("user", false),
    },
  })
}

function slackTokenPair(kind: string, stale: boolean) {
  return {
    access: `xoxe.${kind}`,
    refresh: `xoxe-1-${kind}`,
    expiresAt: Date.now() + (stale ? -60_000 : 60 * 60_000),
  }
}
