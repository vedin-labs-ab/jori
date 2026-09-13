import { getFunctionName } from "convex/server"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { base64UrlEncode } from "../../shared/encoding"
import { googleIntegrationConfigs } from "../google/config"
import { handleGoogleOAuthCallback } from "../google/http"
import { createSignedGoogleState } from "../google/signing"
import { microsoftIntegrationConfigs } from "../microsoft/config"
import { handleMicrosoftOAuthCallback } from "../microsoft/http"
import { createSignedMicrosoftState } from "../microsoft/signing"

const integrations = [
  "gmail",
  "googleCalendar",
  "microsoftEmail",
  "microsoftCalendar",
] as const

const googleProfile = {
  id: "user",
  email: "user@example.com",
  name: "User",
  picture: "avatar",
}
const microsoftProfile = {
  user: {
    id: "user",
    displayName: "User",
    userPrincipalName: "user@example.com",
    mail: undefined,
  },
  tenant: { id: "tenant" },
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000)
  for (const provider of ["GOOGLE", "MICROSOFT"]) {
    vi.stubEnv(`${provider}_CLIENT_ID`, "fixture-client")
    vi.stubEnv(`${provider}_CLIENT_SECRET`, "fixture-secret")
  }
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

for (const integration of integrations) {
  test.each([false, true])(
    `${integration} records the provider payload and connects, with offer %s`,
    async (offer) => {
      const f = await fixture(integration, offer)
      const response = await f.call()
      expectRedirect(response, integration, "connected")
      expect(f.mutations).toEqual([
        ["integrations/connect/state:consume", { attemptId: "attempt" }],
        [
          `integrations/${f.provider}/install:recordOAuthInstallation`,
          {
            integration,
            organizationId: "organization",
            createdBy: "person",
            accessToken: f.accessToken,
            refreshToken: "refresh",
            expiresAt: Date.now() + 3_600_000,
            scope: "fixture-scope",
            profile: f.profile,
            ...(f.provider === "microsoft"
              ? { microsoftTenantId: "tenant" }
              : {}),
          },
        ],
        ...(offer
          ? [
              [
                "integrations/offers/updates:complete",
                {
                  integrationOfferId: "offer",
                  integrationId: "connection",
                },
              ],
            ]
          : []),
      ])
      const body = new URLSearchParams(f.fetch.mock.calls[0][1]?.body as string)
      expect(body.get("redirect_uri")).toBe(f.callbackUrl)
      expect(body.get("code")).toBe("code")
    }
  )

  test.each([
    ["token", "OAuth token exchange failed", false],
    ["profile", "installation profile could not be loaded", false],
    ["record", "installation could not be recorded", true],
    ["offer", "installation could not be recorded", true],
  ] as const)(
    `${integration} reports %s failure at its original stage`,
    async (stage, error, recorded) => {
      const f = await fixture(integration, true, stage)
      const response = await f.call()
      expectRedirect(response, integration, "error")
      expect(f.mutations.at(-1)).toEqual([
        "integrations/offers/updates:complete",
        { integrationOfferId: "offer", error: `${integration} ${error}.` },
      ])
      expect(
        f.mutations.some(([name]) => name.endsWith(":recordOAuthInstallation"))
      ).toBe(recorded)
      expect(f.fetch).toHaveBeenCalledTimes(stage === "token" ? 1 : 2)
    }
  )

  test(`${integration} propagates token transport failure without failing the offer`, async () => {
    const f = await fixture(integration)
    f.fetch.mockReset().mockRejectedValue(new Error("transport failure"))
    await expect(f.call()).rejects.toThrow("transport failure")
    expect(f.mutations).toHaveLength(1)
  })
}

test("Microsoft rejects the wrong integration before exchanging tokens", async () => {
  const f = await fixture("microsoftEmail")
  const response = await handleMicrosoftOAuthCallback(
    f.ctx,
    f.request,
    "microsoftCalendar"
  )
  expect(response.status).toBe(400)
  expect(await response.text()).toBe("Mismatched Microsoft OAuth state")
  expect(f.fetch).not.toHaveBeenCalled()
  expect(f.mutations).toHaveLength(1)
})

function expectRedirect(
  response: Response,
  integration: string,
  status: string
) {
  expect(response.status).toBe(302)
  expect(response.headers.get("location")).toBe(
    `https://eu.jori.app/integrations?keep=1&${integration}=${status}`
  )
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(response.headers.get("referrer-policy")).toBe("no-referrer")
}

async function fixture(
  integration: (typeof integrations)[number],
  offer = true,
  failure?: "token" | "profile" | "record" | "offer"
) {
  const state = {
    integration,
    attemptId: "attempt" as Id<"integrationInstalls">,
    organizationId: "organization",
    createdBy: "person" as Id<"persons">,
    returnUrl: "https://eu.jori.app/integrations?keep=1",
    createdAt: Date.now(),
    ...(offer
      ? { integrationOfferId: "offer" as Id<"integrationOffers"> }
      : {}),
  }
  const google = integration === "gmail" || integration === "googleCalendar"
  const config = google
    ? googleIntegrationConfigs[integration]
    : microsoftIntegrationConfigs[integration]
  const signed = google
    ? await createSignedGoogleState({ ...state, integration })
    : await createSignedMicrosoftState({ ...state, integration })
  const callbackUrl = `https://eu.convex.site${config.callbackPath}`
  const request = new Request(`${callbackUrl}?code=code&state=${signed}`)
  const profile = google ? googleProfile : microsoftProfile
  const fetch = mockFetch(profile, failure)
  const mutations: [string, unknown][] = []
  const ctx = {
    auth: { getUserIdentity: async () => ({ subject: "user" }) },
    runMutation: async (
      reference: Parameters<typeof getFunctionName>[0],
      args: Record<string, unknown>
    ) => {
      const name = getFunctionName(reference)
      mutations.push([name, args])
      if (
        (failure === "record" && name.endsWith(":recordOAuthInstallation")) ||
        (failure === "offer" && args.integrationId === "connection")
      ) {
        throw new Error("persistence failure")
      }
      return "connection"
    },
  } as unknown as ActionCtx
  const call = () =>
    google
      ? handleGoogleOAuthCallback(ctx, request)
      : handleMicrosoftOAuthCallback(ctx, request, integration)
  return {
    call,
    ctx,
    request,
    fetch,
    mutations,
    provider: google ? "google" : "microsoft",
    profile,
    accessToken,
    callbackUrl,
  }
}

const accessToken = `header.${base64UrlEncode(JSON.stringify({ tid: "tenant" }))}.signature`

function mockFetch(
  profile: typeof googleProfile | typeof microsoftProfile,
  failure?: string
) {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      Response.json(
        failure === "token"
          ? { error: "invalid_grant" }
          : {
              access_token: accessToken,
              refresh_token: "refresh",
              expires_in: 3600,
              scope: "fixture-scope",
            }
      )
    )
    .mockResolvedValueOnce(
      Response.json(
        !("user" in profile)
          ? {
              sub: "user",
              email: "user@example.com",
              name: "User",
              picture: "avatar",
            }
          : profile.user,
        { status: failure === "profile" ? 500 : 200 }
      )
    )
  vi.stubGlobal("fetch", fetch)
  return fetch
}
