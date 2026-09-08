// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { internal } from "../../../_generated/api"
import schema from "../../../schema"
import { mentionsLinearApp } from "./messages"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const record = internal.integrations.linear.ingress.messages.record

// These tests exercise the real intake and run rows, not the workflow worker.
vi.mock("../../../runs/execution/workflow", () => ({ startRun: vi.fn() }))
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test.each([
  "eu",
  "us",
])("matches only the installed %s handle or profile", (region) => {
  const data = identity(region)
  for (const text of [
    `@${data.botDisplayName}`,
    `Please @${data.botDisplayName}, help.`,
    `(@${data.botDisplayName.toUpperCase()})`,
    `Ask @${data.botDisplayName}.`,
    `${data.botUrl} help`,
    `[Jori](${data.botUrl})`,
    `<${data.botUrl}>`,
    `Ask ${data.botUrl}.`,
  ]) {
    expect(mentionsLinearApp(text, data), text).toBe(true)
  }
  const other = identity(region === "eu" ? "us" : "eu")
  for (const text of [
    "@jori",
    `@${other.botDisplayName}`,
    `@${data.botDisplayName}-extra`,
    `@${data.botDisplayName}_extra`,
    `@${data.botDisplayName}.extra`,
    `@prefix-${data.botDisplayName}`,
    `email@${data.botDisplayName}`,
    `@@${data.botDisplayName}`,
    other.botUrl,
    `${data.botUrl}-extra`,
    `${data.botUrl}/extra`,
    data.botUrl.replace("vedin-labs", "another-workspace"),
    `https://example.com/?redirect=${data.botUrl}`,
  ]) {
    expect(mentionsLinearApp(text, data), text).toBe(false)
  }
})

test("missing identities and full names never become a generic alias", () => {
  for (const data of [
    undefined,
    {},
    { botName: "jori" },
    { botDisplayName: "", botUrl: "" },
  ]) {
    expect(mentionsLinearApp("@jori @jori-production-eu", data)).toBe(false)
  }
  expect(mentionsLinearApp(undefined, identity("eu"))).toBe(false)
  expect(
    mentionsLinearApp("@joriXeurope", { botDisplayName: "jori.europe" })
  ).toBe(false)
  expect(
    mentionsLinearApp("@jori.europe", { botDisplayName: "jori.europe" })
  ).toBe(true)
})

test.each([
  "eu",
  "us",
])("the %s intake ignores the opposite regional bot", async (region) => {
  const { t, personId } = await setup(region)
  const other = region === "eu" ? "us" : "eu"
  await t.mutation(record, {
    ...message(`@jori-production-${other} help`),
    actor: { kind: "person", personId },
    mentioned: true,
  })
  const stored = await rows(t)
  expect(stored.messages[0]).toMatchObject({
    mentioned: false,
    surface: "linear",
  })
  expect(stored.conversations).toEqual([])
  expect(stored.runs).toEqual([])
})

test.each([
  "eu",
  "us",
])("the %s intake starts once and preserves unmentioned follow-ups", async (region) => {
  const { t, personId } = await setup(region)
  const input = {
    ...message(`@jori-production-${region} help`),
    actor: { kind: "person" as const, personId },
    mentioned: false,
  }
  await t.mutation(record, input)
  await t.mutation(record, input)
  let stored = await rows(t)
  expect(stored.messages).toHaveLength(1)
  expect(stored.messages[0]?.mentioned).toBe(true)
  expect(stored.runs).toHaveLength(1)
  const previousRun = stored.runs[0]
  if (previousRun === undefined) {
    throw new Error("Expected the initial mention run")
  }
  await t.run(
    async (ctx) => await ctx.db.patch(previousRun._id, { status: "completed" })
  )
  await t.mutation(record, {
    ...input,
    externalId: "follow-up",
    text: "Continue please",
  })
  stored = await rows(t)
  expect(stored.messages[1]?.mentioned).toBe(false)
  expect(stored.conversations).toHaveLength(1)
  expect(stored.runs).toHaveLength(2)
  expect(stored.runs[1]?.cause).toMatchObject({
    type: "message",
    kind: "reply",
  })
})

test("own-bot messages cannot start runs even when mentioning the app", async () => {
  const { t } = await setup("eu")
  await t.mutation(record, {
    ...message("@jori-production-eu help"),
    actor: { kind: "person", externalId: "bot-eu" },
  })
  const stored = await rows(t)
  expect(stored.messages[0]?.actor?.kind).toBe("self")
  expect(stored.runs).toEqual([])
})

test("record-only approval intake does not dispatch", async () => {
  const { t, personId } = await setup("eu")
  await t.mutation(record, {
    ...message("@jori-production-eu approve ABC12345"),
    actor: { kind: "person", personId },
    mode: "record",
  })
  expect((await rows(t)).runs).toEqual([])
})

test("reinstalling refreshes the bot identity on the existing integration", async () => {
  const { t, personId } = await setup("eu")
  const newIdentity = identity("renamed")
  await t.mutation(
    internal.integrations.linear.install.recordOAuthInstallation,
    {
      organizationId: "test",
      createdBy: personId,
      accessToken: "synthetic-access",
      refreshToken: "synthetic-refresh",
      expiresAt: Date.now() + 100_000,
      profile: { ...newIdentity, organization: { id: "workspace" } },
    }
  )
  const integration = await t.run(
    async (ctx) => await ctx.db.query("integrations").unique()
  )
  expect(integration?.data).toEqual(newIdentity)
  expect(mentionsLinearApp("@jori-production-eu", integration?.data)).toBe(
    false
  )
  expect(mentionsLinearApp("@jori-production-renamed", integration?.data)).toBe(
    true
  )
})

test("an installation without mention metadata cannot dispatch a generic alias", async () => {
  const { t, personId } = await setup("eu")
  await t.run(async (ctx) => {
    const integration = await ctx.db.query("integrations").unique()
    if (integration !== null) {
      await ctx.db.patch(integration._id, { data: { botId: "bot-eu" } })
    }
  })
  await t.mutation(record, {
    ...message("@jori @jori-production-eu help"),
    actor: { kind: "person", personId },
  })
  const stored = await rows(t)
  expect(stored.messages[0]?.mentioned).toBe(false)
  expect(stored.conversations).toEqual([])
  expect(stored.runs).toEqual([])
})

function identity(region: string) {
  return {
    botId: `bot-${region}`,
    botDisplayName: `jori-production-${region}`,
    botUrl: `https://linear.app/vedin-labs/profiles/jori-production-${region}`,
  }
}

function message(text: string) {
  return {
    accountId: "workspace",
    type: "comment.create",
    externalId: "delivery",
    conversationId: "synthetic-issue",
    text,
  }
}

async function setup(region: string) {
  const t = convexTest(schema, modules)
  const personId = await t.run(async (ctx) => {
    const createdBy = await ctx.db.insert("persons", {
      organizationId: "test",
      createdAt: 0,
      updatedAt: 0,
    })
    await ctx.db.insert("integrations", {
      organizationId: "test",
      createdBy,
      integration: "linear",
      externalId: "workspace",
      credentials: {},
      scope: "organization",
      status: "active",
      createdAt: 0,
      updatedAt: 0,
      data: identity(region),
    })
    return createdBy
  })
  return { t, personId }
}

async function rows(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ({
    messages: await ctx.db.query("messages").take(5),
    conversations: await ctx.db.query("conversations").take(5),
    runs: await ctx.db.query("runs").take(5),
  }))
}
