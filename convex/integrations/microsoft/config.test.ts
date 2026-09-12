import { afterEach, expect, test, vi } from "vitest"
import { id } from "../../../test/convex/database"
import { type ActionCtx } from "../../_generated/server"
import { regionalCallback } from "../connect/handoff"
import { microsoftIntegrationConfigs } from "./config"
import { microsoftGraphJsonNext } from "./graph"
import { handleMicrosoftInstall } from "./http"
import {
  createSignedMicrosoftState,
  parseSignedMicrosoftState,
} from "./signing"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test("requests only identity, offline and the matching delegated permissions", () => {
  expect(microsoftIntegrationConfigs.microsoftEmail.scopes).toEqual([
    "offline_access",
    "User.Read",
    "Mail.ReadWrite",
    "Mail.Send",
  ])
  expect(microsoftIntegrationConfigs.microsoftCalendar.scopes).toEqual([
    "offline_access",
    "User.Read",
    "Calendars.ReadWrite",
  ])
})

test.each(["eu", "us"])(
  "%s install uses its client and callback, with organizational accounts",
  async (region) => {
    vi.stubEnv("MICROSOFT_CLIENT_ID", `fixture-${region}-client`)
    for (const provider of ["microsoftEmail", "microsoftCalendar"] as const) {
      const config = microsoftIntegrationConfigs[provider]
      const response = await handleMicrosoftInstall(
        new Request(
          `https://fixture-${region}.convex.site${config.installPath}?state=fixture-state`
        ),
        provider
      )
      const location = new URL(response.headers.get("location") ?? "")
      expect(location.origin).toBe("https://login.microsoftonline.com")
      expect(location.pathname).toBe("/organizations/oauth2/v2.0/authorize")
      expect(location.searchParams.get("client_id")).toBe(
        `fixture-${region}-client`
      )
      expect(location.searchParams.get("redirect_uri")).toBe(
        `https://fixture-${region}.convex.site${config.callbackPath}`
      )
      expect(location.searchParams.get("scope")).toBe(config.scopes.join(" "))
      expect(response.headers.get("cache-control")).toBe("no-store")
      expect(response.headers.get("referrer-policy")).toBe("no-referrer")
    }
  }
)

test("a signed OAuth state from one regional app fails under the other app secret", async () => {
  vi.stubEnv("MICROSOFT_CLIENT_SECRET", "fixture-eu-secret")
  const state = {
    attemptId: id<"integrationInstalls">("attempt"),
    organizationId: "fixture-eu",
    createdBy: id<"persons">("fixture"),
    returnUrl: "https://eu.usejori.com",
    createdAt: Date.now(),
    integration: "microsoftEmail" as const,
  }
  const signed = await createSignedMicrosoftState(state)
  expect(await parseSignedMicrosoftState(signed)).toEqual(state)
  vi.stubEnv("MICROSOFT_CLIENT_SECRET", "fixture-us-secret")
  await expect(parseSignedMicrosoftState(signed)).rejects.toThrow(
    "Invalid Microsoft state signature"
  )
})

test.each(["eu", "us"])(
  "%s callback handoff stays on its own frontend",
  async (region) => {
    vi.stubEnv("JORI_APP_URL", `https://${region}.usejori.com`)
    const ctx = {
      auth: { getUserIdentity: async () => null },
    } as unknown as ActionCtx
    const response = await regionalCallback(
      ctx,
      new Request(
        `https://fixture-${region}.convex.site/microsoft-email/oauth/callback?code=fixture&state=signed`
      )
    )
    const location = new URL(response?.headers.get("location") ?? "")
    expect(location.origin).toBe(`https://${region}.usejori.com`)
    expect(location.pathname).toBe("/api/integrations/callback")
  }
)

test.each([
  "https://attacker.example/v1.0/me/events",
  "https://graph.microsoft.com/beta/me/events",
  "http://graph.microsoft.com/v1.0/me/events",
])(
  "does not send a bearer token to an invalid pagination URL: %s",
  async (nextLink) => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)
    await expect(
      microsoftGraphJsonNext("fixture-token", nextLink)
    ).rejects.toThrow("Invalid Microsoft Graph pagination URL")
    expect(fetch).not.toHaveBeenCalled()
  }
)
