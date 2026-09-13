// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import schema from "../../schema"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const integrations = [
  "gmail",
  "googleCalendar",
  "microsoftEmail",
  "microsoftCalendar",
] as const
type Integration = (typeof integrations)[number]
type Installation = {
  organizationId: string
  createdBy: Id<"persons">
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope: string
}

function record(
  t: TestConvex<typeof schema>,
  integration: Integration,
  args: Installation,
  reconnect = false
) {
  return integration === "gmail" || integration === "googleCalendar"
    ? t.mutation(internal.integrations.google.install.recordOAuthInstallation, {
        ...args,
        integration,
        profile: {
          id: "account",
          email: "person@example.com",
          name: "Person",
          picture: reconnect ? undefined : "https://example.com/avatar.png",
        },
      })
    : t.mutation(
        internal.integrations.microsoft.install.recordOAuthInstallation,
        {
          ...args,
          integration,
          microsoftTenantId: reconnect ? "new-tenant" : "tenant",
          profile: {
            user: {
              id: "account",
              displayName: "Person",
              mail: reconnect ? undefined : "person@example.com",
              userPrincipalName: "fallback@example.com",
            },
            tenant: {
              id: "tenant",
              displayName: reconnect ? "New tenant" : "Tenant",
            },
          },
        }
      )
}

async function setup(integration: Integration) {
  const t = convexTest(schema, modules)
  const createdBy = await t.run(
    async (ctx) =>
      await ctx.db.insert("persons", {
        organizationId: "org",
        createdAt: 0,
        updatedAt: 0,
      })
  )
  const args: Installation = {
    organizationId: "org",
    createdBy,
    accessToken: "first-access",
    expiresAt: 1000,
    scope: "calendar",
  }
  const install = (overrides: Partial<Installation> = {}, reconnect = false) =>
    record(t, integration, { ...args, ...overrides }, reconnect)
  const provider: "google" | "microsoft" = integration.startsWith("microsoft")
    ? "microsoft"
    : "google"
  return { t, args, install, provider }
}

test.each(integrations)(
  "%s preserves account and provider details when reconnecting",
  async (integration) => {
    const { t, args, install, provider } = await setup(integration)
    const id = await install({ refreshToken: "retained-refresh" })
    const original = await t.run(async (ctx) => await ctx.db.get(id))
    expect(original).toMatchObject({
      integration,
      email: "person@example.com",
      connectionGeneration: 1,
    })
    if (provider === "google") {
      expect(original?.avatar).toBe("https://example.com/avatar.png")
    }
    await t.run(
      async (ctx) =>
        await ctx.db.patch(id, {
          status: "disconnected",
          credentialVersion: 3,
          data: { stale: true },
        })
    )
    expect(await install({ accessToken: "new-access" }, true)).toBe(id)
    const current = await t.run(async (ctx) => await ctx.db.get(id))
    const email =
      provider === "google" ? "person@example.com" : "fallback@example.com"
    expect(current).toMatchObject({
      organizationId: "org",
      ownerId: args.createdBy,
      createdBy: args.createdBy,
      createdAt: original?.createdAt,
      externalId: "account",
      email,
      scope: "user",
      status: "active",
      connectionGeneration: 2,
      credentialVersion: 0,
      credentials: {
        tokens: { access: "new-access", refresh: "retained-refresh" },
        expiresAt: 1000,
        scope: "calendar",
      },
    })
    expect(current?.avatar).toBeUndefined()
    expect(current?.data).toEqual(
      provider === "google" ? undefined : { tenantName: "New tenant" }
    )
    if (provider === "microsoft") {
      expect(current?.credentials.tenantId).toBe("new-tenant")
    }
    const identity = await accountIdentity(t, provider)
    expect(identity).toMatchObject({
      personId: args.createdBy,
      email,
      name: "Person",
      link: { method: "oauth" },
    })
  }
)

test.each(integrations)(
  "%s retains refresh tokens only for the same organization, owner and integration",
  async (integration) => {
    const { t, args, install, provider } = await setup(integration)
    const error = `${provider === "google" ? "Google" : "Microsoft"} OAuth did not return a refresh token`
    await expect(install()).rejects.toThrow(error)
    const id = await install({ refreshToken: "first-refresh" })
    const otherPerson = await t.run(
      async (ctx) =>
        await ctx.db.insert("persons", {
          organizationId: "org",
          createdAt: 0,
          updatedAt: 0,
        })
    )
    await expect(install({ organizationId: "another-org" })).rejects.toThrow(
      error
    )
    await expect(install({ createdBy: otherPerson })).rejects.toThrow(error)
    const otherIntegration =
      integration === "gmail" ? "googleCalendar" : "gmail"
    await expect(record(t, otherIntegration, args)).rejects.toThrow(
      "OAuth did not return a refresh token"
    )
    expect(await install({ refreshToken: "replacement-refresh" })).toBe(id)
    expect(
      (await t.run(async (ctx) => await ctx.db.get(id)))?.credentials.tokens
        .refresh
    ).toBe("replacement-refresh")
  }
)

async function accountIdentity(
  t: TestConvex<typeof schema>,
  provider: "google" | "microsoft"
) {
  return await t.run(
    async (ctx) =>
      await ctx.db
        .query("identities")
        .withIndex("by_organization_provider_external_id", (q) =>
          q
            .eq("organizationId", "org")
            .eq("provider", provider)
            .eq("externalId", "account")
        )
        .unique()
  )
}
