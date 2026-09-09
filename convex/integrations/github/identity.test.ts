// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"
import { createGitHubInstallationToken } from "./app"
import { isGitHubSelfActor } from "./data"
import { fetchGitHubIdentity } from "./identity"
import { mentionsGitHubApp } from "./ingress/messages"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const identity = {
  appId: "11",
  appSlug: "jori-eu",
  botLogin: "jori-eu[bot]",
  botUserId: "101",
}

vi.mock("./app", () => ({
  githubAppRequest: vi.fn(async () => ({ id: 11, slug: "jori-eu" })),
  createGitHubInstallationToken: vi.fn(async () => ({
    token: "fresh-installation-token",
  })),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

test("loads the regional app's canonical bot identity", async () => {
  const fetch = vi.fn(async () =>
    Response.json({ id: 101, login: "jori-eu[bot]", type: "Bot" })
  )
  vi.stubGlobal("fetch", fetch)
  expect(await fetchGitHubIdentity()).toEqual(identity)
  expect(fetch).toHaveBeenCalledWith(
    "https://api.github.com/users/jori-eu%5Bbot%5D",
    expect.anything()
  )
})

test("rejects a bot profile that belongs to another app", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ id: 102, login: "jori-us[bot]", type: "Bot" })
    )
  )
  await expect(fetchGitHubIdentity()).rejects.toThrow("did not match")
})

test("refreshes existing GitHub connections without changing ownership, access or other providers", async () => {
  const t = convexTest(schema, modules)
  const ids = await seedConnections(t)
  const fetch = vi.fn(async (_url: string, init?: RequestInit) =>
    new Headers(init?.headers).get("authorization") ===
    "Bearer fresh-installation-token"
      ? Response.json({ id: 101, login: "jori-eu[bot]", type: "Bot" })
      : new Response(null, { status: 403 })
  )
  vi.stubGlobal("fetch", fetch)
  expect(
    await t.action(internal.integrations.github.identity.refresh, {})
  ).toEqual({ appSlug: "jori-eu", updated: 2 })
  expect(createGitHubInstallationToken).toHaveBeenCalledWith("installation")
  const rows = await t.run(async (ctx) => ({
    github: await ctx.db.get(ids.github),
    expired: await ctx.db.get(ids.expired),
    slack: await ctx.db.get(ids.slack),
  }))
  expect(rows.github).toMatchObject({
    organizationId: "eu",
    externalId: "installation",
    status: "active",
    credentials: {
      installationId: "installation",
      tokens: { access: "existing-token" },
    },
    data: { ...identity, setting: "preserve" },
  })
  expect(rows.expired).toMatchObject({ status: "expired", data: identity })
  expect(rows.slack?.data).toEqual({ botUserId: "slack-bot" })
  expect(mentionsGitHubApp("@jori-eu help", rows.github?.data)).toBe(true)
  expect(mentionsGitHubApp("@old-name @jori-us", rows.github?.data)).toBe(false)
})

test("refresh never requests an installation token for expired or disconnected connections", async () => {
  const t = convexTest(schema, modules)
  const ids = await seedConnections(t)
  await t.run(async (ctx) => {
    await ctx.db.patch(ids.github, { status: "disconnected" })
  })
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ id: 101, login: "jori-eu[bot]", type: "Bot" })
    )
  )
  expect(
    await t.query(internal.integrations.github.identity.installation, {
      cursor: null,
    })
  ).toEqual({ installationId: null, cursor: null })
  expect(
    await t.action(internal.integrations.github.identity.refresh, {})
  ).toEqual({ appSlug: "jori-eu", updated: 2 })
  expect(createGitHubInstallationToken).not.toHaveBeenCalled()
})

async function seedConnections(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const person = await ctx.db.insert("persons", {
      organizationId: "eu",
      createdAt: 0,
      updatedAt: 0,
    })
    const base = {
      organizationId: "eu",
      createdBy: person,
      scope: "organization" as const,
      createdAt: 0,
      updatedAt: 0,
    }
    const github = await ctx.db.insert("integrations", {
      ...base,
      integration: "github",
      externalId: "installation",
      status: "active",
      credentials: {
        installationId: "installation",
        tokens: { access: "existing-token" },
      },
      data: {
        appSlug: "old-name",
        botLogin: "old-name[bot]",
        setting: "preserve",
      },
    })
    const expired = await ctx.db.insert("integrations", {
      ...base,
      integration: "github",
      externalId: "expired",
      status: "expired",
      credentials: {},
    })
    const slack = await ctx.db.insert("integrations", {
      ...base,
      integration: "slack",
      externalId: "slack",
      status: "active",
      credentials: {},
      data: { botUserId: "slack-bot" },
    })
    return { github, expired, slack }
  })
}

test("stable bot ID recognizes historical self messages after a rename and rejects a reused name", () => {
  const integration = { integration: "github" as const, data: identity }
  expect(
    isGitHubSelfActor(
      { kind: "bot", externalId: "101", name: "old-name[bot]" },
      integration
    )
  ).toBe(true)
  expect(
    isGitHubSelfActor(
      { kind: "bot", externalId: "102", name: "jori-eu[bot]" },
      integration
    )
  ).toBe(false)
})

test("identity refresh cannot replace a connection from another registration", async () => {
  const t = convexTest(schema, modules)
  const ids = await seedConnections(t)
  await t.run(
    async (ctx) =>
      await ctx.db.patch(ids.github, {
        data: { appId: "us-app", appSlug: "jori-us" },
      })
  )
  await expect(
    t.mutation(internal.integrations.github.identity.update, {
      identity,
      cursor: null,
    })
  ).rejects.toThrow("different app registration")
  expect(
    (await t.run(async (ctx) => await ctx.db.get(ids.github)))?.data
  ).toEqual({ appId: "us-app", appSlug: "jori-us" })
})
