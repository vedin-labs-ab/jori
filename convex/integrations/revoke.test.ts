import { afterEach, expect, test, vi } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { revokeIntegrationAccess } from "./revoke"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test("revokes Google refresh tokens", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("", { status: 200 }))
  vi.stubGlobal("fetch", fetch)

  await revokeIntegrationAccess(
    integration("gmail", {
      accessToken: "google-access",
      expiresAt: Date.now() + 60_000,
      refreshToken: "google-refresh",
    })
  )

  expect(fetch).toHaveBeenCalledWith(
    "https://oauth2.googleapis.com/revoke",
    expect.objectContaining({
      body: expect.any(URLSearchParams),
      method: "POST",
    })
  )
  expect(fetch.mock.calls[0]?.[1].body.get("token")).toBe("google-refresh")
})

test("revokes Linear refresh tokens with client authentication", async () => {
  vi.stubEnv("LINEAR_CLIENT_ID", "linear-client")
  vi.stubEnv("LINEAR_CLIENT_SECRET", "linear-secret")

  const fetch = vi.fn().mockResolvedValue(new Response("", { status: 200 }))
  vi.stubGlobal("fetch", fetch)

  await revokeIntegrationAccess(
    integration("linear", {
      accessToken: "linear-access",
      expiresAt: Date.now() + 60_000,
      refreshToken: "linear-refresh",
    })
  )

  expect(fetch).toHaveBeenCalledWith(
    "https://api.linear.app/oauth/revoke",
    expect.objectContaining({
      body: expect.any(URLSearchParams),
      headers: expect.objectContaining({
        authorization: "Basic bGluZWFyLWNsaWVudDpsaW5lYXItc2VjcmV0",
      }),
      method: "POST",
    })
  )
  expect(fetch.mock.calls[0]?.[1].body.get("token")).toBe("linear-refresh")
  expect(fetch.mock.calls[0]?.[1].body.get("token_type_hint")).toBe(
    "refresh_token"
  )
})

test("revokes Notion access tokens with client authentication", async () => {
  vi.stubEnv("NOTION_CLIENT_ID", "notion-client")
  vi.stubEnv("NOTION_CLIENT_SECRET", "notion-secret")

  const fetch = vi.fn().mockResolvedValue(Response.json({ request_id: "id" }))
  vi.stubGlobal("fetch", fetch)

  await revokeIntegrationAccess(
    integration("notion", {
      accessToken: "notion-access",
      refreshToken: "notion-refresh",
    })
  )

  expect(fetch).toHaveBeenCalledWith(
    "https://api.notion.com/v1/oauth/revoke",
    expect.objectContaining({
      body: JSON.stringify({ token: "notion-access" }),
      headers: expect.objectContaining({
        authorization: "Basic bm90aW9uLWNsaWVudDpub3Rpb24tc2VjcmV0",
      }),
      method: "POST",
    })
  )
})

test("falls back to Slack token revocation when app uninstall is unavailable", async () => {
  vi.stubEnv("SLACK_CLIENT_ID", "slack-client")
  vi.stubEnv("SLACK_CLIENT_SECRET", "slack-secret")

  const fetch = vi.fn(async (url: string) => {
    if (url === "https://slack.com/api/apps.uninstall") {
      return Response.json({ ok: false, error: "no_permission" })
    }

    return Response.json({ ok: true, revoked: true })
  })
  vi.stubGlobal("fetch", fetch)

  await revokeIntegrationAccess(
    integration("slack", {
      bot: "xoxb-bot",
      user: "xoxp-user",
    })
  )

  expect(fetch).toHaveBeenCalledTimes(3)
  expect(fetch.mock.calls.map((call) => call[0])).toEqual([
    "https://slack.com/api/apps.uninstall",
    "https://slack.com/api/auth.revoke",
    "https://slack.com/api/auth.revoke",
  ])
})

test("does not call Microsoft tenant-wide revocation APIs", async () => {
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)

  await revokeIntegrationAccess(
    integration("microsoftEmail", {
      accessToken: "microsoft-access",
      expiresAt: Date.now() + 60_000,
      refreshToken: "microsoft-refresh",
      tenantId: "microsoft-tenant",
    })
  )

  expect(fetch).not.toHaveBeenCalled()
})

function integration(
  provider: Doc<"integrations">["provider"],
  credentials: Doc<"integrations">["credentials"]
): Doc<"integrations"> {
  return {
    _creationTime: Date.now(),
    _id: `${provider}-integration`,
    externalId: `${provider}-account`,
    createdAt: Date.now(),
    createdBy: "user",
    credentials,
    provider,
    scope:
      provider === "gmail" || provider === "microsoftEmail" ? "user" : "tenant",
    status: "active",
    tenantId: "tenant",
    updatedAt: Date.now(),
  } as Doc<"integrations">
}
