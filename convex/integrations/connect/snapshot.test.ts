// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, assert, beforeEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import schema from "../../schema"
import { sha256Hex } from "../../shared/crypto"
import { prepareIntegrationForRuntime } from "../runtime"

const modules = import.meta.glob("/convex/**/*.{ts,js}")

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv("SLACK_CLIENT_ID", "test-client")
  vi.stubEnv("SLACK_CLIENT_SECRET", "test-client-secret")
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function pair(label: string, stale = false) {
  return {
    access: `${label}-access`,
    refresh: `${label}-refresh`,
    expiresAt: Date.now() + (stale ? -1 : 3_600_000),
  }
}

async function setup(staleUser = false) {
  const t = convexTest(schema, modules)
  const personId = await t.run(
    async (ctx) =>
      await ctx.db.insert("persons", {
        organizationId: "org",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
  )
  const install = {
    organizationId: "org",
    createdBy: personId,
    accountId: "TTEST",
    team: { id: "TTEST", name: "Jori test" },
    botUserId: "UBOT",
    appId: "ATEST",
    bot: pair("old-bot", true),
    user: pair("old-user", staleUser),
  }
  const integrationId = await t.mutation(
    internal.integrations.slack.install.recordOAuthInstallation,
    install
  )
  const integration = await t.run(
    async (ctx) => await ctx.db.get(integrationId)
  )
  assert(integration)
  return { t, install, integration }
}

test.each([
  ["reconnect", true],
  ["reconnect", false],
  ["rotation", true],
  ["rotation", false],
] as const)("a delayed refresh cannot overwrite or expire a newer %s when success is %s", async (change, succeeded) => {
  const { t, install, integration } = await setup()
  const replacement = { bot: pair("new-bot"), user: pair("new-user") }
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => {
      if (change === "reconnect") {
        await t.mutation(
          internal.integrations.slack.install.recordOAuthInstallation,
          { ...install, ...replacement }
        )
      } else {
        await t.mutation(
          internal.integrations.slack.install.updateOAuthCredentials,
          {
            integrationId: integration._id,
            expectedSnapshot: { connectionGeneration: 1, credentialVersion: 0 },
            expectedTokens: {
              bot: await sha256Hex(install.bot.refresh),
              user: await sha256Hex(install.user.refresh),
            },
            ...replacement,
          }
        )
      }
      return Response.json(
        succeeded
          ? {
              ok: true,
              access_token: "late-access",
              refresh_token: "late-refresh",
              expires_in: 43_200,
            }
          : { ok: false, error: "invalid_refresh_token" }
      )
    })
  )
  await expect(
    prepareIntegrationForRuntime(
      { runMutation: t.mutation } as unknown as ActionCtx,
      { integration }
    )
  ).rejects.toThrow("Integration connection changed during token refresh")
  expect(
    await t.run(async (ctx) => await ctx.db.get(integration._id))
  ).toMatchObject({
    status: "active",
    credentials: replacement,
    connectionGeneration: change === "reconnect" ? 2 : 1,
    credentialVersion: change === "reconnect" ? 0 : 1,
  })
})

test("a valid refresh advances its credential snapshot and a matching dead grant can expire", async () => {
  const { t, integration } = await setup()
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        ok: true,
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 43_200,
      })
    )
  )
  const prepared = await prepareIntegrationForRuntime(
    { runMutation: t.mutation } as unknown as ActionCtx,
    { integration }
  )
  expect(prepared.credentialVersion).toBe(1)
  expect(
    await t.mutation(internal.integrations.expire.markExpired, {
      integrationId: integration._id,
      expectedSnapshot: { connectionGeneration: 1, credentialVersion: 0 },
    })
  ).toBe(false)
  expect(
    await t.mutation(internal.integrations.expire.markExpired, {
      integrationId: integration._id,
      expectedSnapshot: { connectionGeneration: 1, credentialVersion: 1 },
    })
  ).toBe(true)
})

test("Slack preserves a spent bot refresh token when refreshing the user fails", async () => {
  const { t, install, integration } = await setup(true)
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        ok: true,
        access_token: "bot-access",
        refresh_token: "bot-refresh",
        expires_in: 43_200,
      })
    )
    .mockResolvedValueOnce(Response.json({ ok: false, error: "ratelimited" }))
  vi.stubGlobal("fetch", fetch)
  await expect(
    prepareIntegrationForRuntime(
      { runMutation: t.mutation } as unknown as ActionCtx,
      { integration }
    )
  ).rejects.toThrow("Slack token refresh failed")
  const partial = await t.run(async (ctx) => await ctx.db.get(integration._id))
  assert(partial)
  expect(partial).toMatchObject({
    status: "active",
    credentialVersion: 1,
    credentials: {
      bot: { access: "bot-access", refresh: "bot-refresh" },
      user: install.user,
    },
  })
  fetch.mockReset().mockResolvedValue(
    Response.json({
      ok: true,
      access_token: "user-access",
      refresh_token: "user-refresh",
      expires_in: 43_200,
    })
  )
  const prepared = await prepareIntegrationForRuntime(
    { runMutation: t.mutation } as unknown as ActionCtx,
    { integration: partial }
  )
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(prepared).toMatchObject({
    credentialVersion: 2,
    credentials: {
      bot: { refresh: "bot-refresh" },
      user: { refresh: "user-refresh" },
    },
  })
})

test("concurrent Slack refreshes merge independent bot and user token pairs", async () => {
  const { t, install, integration } = await setup()
  const user = pair("concurrent-user")
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => {
      await t.mutation(
        internal.integrations.slack.install.updateOAuthCredentials,
        {
          integrationId: integration._id,
          expectedSnapshot: { connectionGeneration: 1, credentialVersion: 0 },
          expectedTokens: { user: await sha256Hex(install.user.refresh) },
          user,
        }
      )
      return Response.json({
        ok: true,
        access_token: "bot-access",
        refresh_token: "bot-refresh",
        expires_in: 43_200,
      })
    })
  )
  const prepared = await prepareIntegrationForRuntime(
    { runMutation: t.mutation } as unknown as ActionCtx,
    { integration }
  )
  expect(prepared).toMatchObject({
    credentialVersion: 2,
    credentials: {
      bot: { access: "bot-access", refresh: "bot-refresh" },
      user,
    },
  })
  expect(
    await t.run(async (ctx) => await ctx.db.get(integration._id))
  ).toMatchObject({
    status: "active",
    credentialVersion: 2,
    credentials: prepared.credentials,
  })
})
