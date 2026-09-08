import { getFunctionName } from "convex/server"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { integrationDoc } from "../../../test/convex/integrations"
import { type ActionCtx } from "../../_generated/server"
import { prepareIntegrationForRuntime } from "../runtime"

beforeEach(() => {
  vi.stubEnv("MICROSOFT_CLIENT_ID", "fixture-client")
  vi.stubEnv("MICROSOFT_CLIENT_SECRET", "fixture-secret")
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const credentials = {
  tokens: { access: "old-access", refresh: "old-refresh" },
  expiresAt: 0,
  tenantId: "fixture-tenant",
}

test.each([
  "microsoftEmail",
  "microsoftCalendar",
] as const)("%s reuses fresh credentials without network or persistence", async (integration) => {
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  const runMutation = vi.fn()
  const row = integrationDoc({
    integration,
    credentials: { ...credentials, expiresAt: Date.now() + 600_000 },
  })
  const prepared = await prepareIntegrationForRuntime(
    { runMutation } as unknown as ActionCtx,
    { integration: row }
  )
  expect(prepared).toBe(row)
  expect(fetch).not.toHaveBeenCalled()
  expect(runMutation).not.toHaveBeenCalled()
})

test.each([
  "microsoftEmail",
  "microsoftCalendar",
] as const)("%s refreshes through its tenant and persists rotated tokens", async (integration) => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      access_token: "new-access",
      refresh_token: "new-refresh",
      expires_in: 3600,
      scope: "fixture-scope",
    })
  )
  vi.stubGlobal("fetch", fetch)
  const refreshed = {
    ...credentials,
    tokens: { access: "new-access", refresh: "new-refresh" },
    expiresAt: Date.now() + 3_600_000,
  }
  const runMutation = vi.fn().mockResolvedValue(refreshed)
  const prepared = await prepareIntegrationForRuntime(
    { runMutation } as unknown as ActionCtx,
    { integration: integrationDoc({ integration, credentials }) }
  )
  expect(prepared.credentials).toEqual(refreshed)
  const [url, init] = fetch.mock.calls[0]
  expect(url).toBe(
    "https://login.microsoftonline.com/fixture-tenant/oauth2/v2.0/token"
  )
  expect(Object.fromEntries(new URLSearchParams(init.body))).toEqual({
    client_id: "fixture-client",
    client_secret: "fixture-secret",
    grant_type: "refresh_token",
    refresh_token: "old-refresh",
  })
  expect(getFunctionName(runMutation.mock.calls[0][0])).toBe(
    "integrations/microsoft/install:updateOAuthCredentials"
  )
  expect(runMutation.mock.calls[0][1]).toMatchObject({
    integrationId: "integration",
    accessToken: "new-access",
    refreshToken: "new-refresh",
    scope: "fixture-scope",
  })
})

test.each([
  { error: "invalid_grant", expired: true },
  { error: "temporarily_unavailable", expired: false },
])("handles $error without persisting invalid tokens", async ({
  error,
  expired,
}) => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json({ error, error_description: "Synthetic refresh failure" })
    )
  vi.stubGlobal("fetch", fetch)
  const runMutation = vi.fn()
  await expect(
    prepareIntegrationForRuntime({ runMutation } as unknown as ActionCtx, {
      integration: integrationDoc({
        integration: "microsoftEmail",
        credentials,
      }),
    })
  ).rejects.toThrow(
    expired ? "needs to be reconnected" : "Synthetic refresh failure"
  )
  expect(runMutation).toHaveBeenCalledTimes(expired ? 1 : 0)
  if (expired) {
    expect(getFunctionName(runMutation.mock.calls[0][0])).toBe(
      "integrations/expire:markExpired"
    )
  }
})

test("rejects a refresh response without the expected replacement refresh token", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ access_token: "new-access", expires_in: 3600 })
      )
  )
  const runMutation = vi.fn()
  await expect(
    prepareIntegrationForRuntime({ runMutation } as unknown as ActionCtx, {
      integration: integrationDoc({
        integration: "microsoftCalendar",
        credentials,
      }),
    })
  ).rejects.toThrow("missing refresh token")
  expect(runMutation).not.toHaveBeenCalled()
})
