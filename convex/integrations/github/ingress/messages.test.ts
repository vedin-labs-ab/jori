// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "../../../_generated/api"
import schema from "../../../schema"
import { mentionsGitHubApp } from "./messages"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const identity = { appSlug: "jori-production-eu" }
const record = internal.integrations.github.ingress.messages.record

test.each([
  "@jori-production-eu",
  "Please @jori-production-eu help.",
  "(@JORI-PRODUCTION-EU), help.",
  "@jori-production-eu[bot]: help.",
  "@someone @jori-production-eu\nhelp.",
])("matches the installed GitHub app: %s", (text) => {
  expect(mentionsGitHubApp(text, identity)).toBe(true)
})

test.each([
  "@jori",
  "@jori-production-us",
  "@jori-production-us[bot]",
  "@jori-production-europe",
  "@jori-production-eu-extra",
  "@jori-production-eu_extra",
  "@jori-production-eu[bot]-extra",
  "@jori-production-eu[other]",
  "@prefix-jori-production-eu",
  "email@jori-production-eu.com",
  "@@jori-production-eu",
  "plain jori-production-eu",
  "",
  undefined,
])("rejects another handle or non-mention: %s", (text) => {
  expect(mentionsGitHubApp(text, identity)).toBe(false)
})

test("uses a stored bot login and never invents a generic alias", () => {
  expect(
    mentionsGitHubApp("@renamed-app[bot]", { botLogin: "renamed-app[bot]" })
  ).toBe(true)
  expect(mentionsGitHubApp("@jori @jori-production-eu", undefined)).toBe(false)
  expect(mentionsGitHubApp("@jori", { appSlug: "jori" })).toBe(true)
})

test.each([
  ["@jori-production-eu", true],
  ["@jori-production-eu[bot]", true],
  ["@jori-production-us", false],
  ["@jori-production-eu-extra", false],
])("records installed-app targeting through shared intake: %s", async (text, mentioned) => {
  const t = convexTest(schema, modules)
  await seedIntegration(t)
  await t.mutation(record, {
    ...message(text),
    mode: "record",
    // The provider edge computes the decision rather than accepting callers'.
    mentioned: !mentioned,
  })
  const stored = await t.run(
    async (ctx) => await ctx.db.query("messages").unique()
  )
  expect(stored).toMatchObject({ mentioned, surface: "github", text })
  expect(
    await t.run(async (ctx) => await ctx.db.query("runs").take(1))
  ).toEqual([])
})

test("does not record a comment for an unknown installation", async () => {
  const t = convexTest(schema, modules)
  await t.mutation(record, message("@jori-production-eu"))
  expect(
    await t.run(async (ctx) => await ctx.db.query("messages").take(1))
  ).toEqual([])
})

test("another regional app's mention does not open a conversation or run", async () => {
  const t = convexTest(schema, modules)
  const personId = await seedIntegration(t)
  await t.mutation(record, {
    ...message("@jori-production-us help"),
    actor: { kind: "person", personId },
  })
  const stored = await t.run(async (ctx) => ({
    message: await ctx.db.query("messages").unique(),
    conversations: await ctx.db.query("conversations").take(1),
    runs: await ctx.db.query("runs").take(1),
  }))
  expect(stored.message?.mentioned).toBe(false)
  expect(stored.conversations).toEqual([])
  expect(stored.runs).toEqual([])
})

test("shared intake requires an explicit Linear mention decision", async () => {
  const t = convexTest(schema, modules)
  await seedIntegration(t, "linear")
  for (const mentioned of [undefined, false, true]) {
    await t.mutation(internal.conversations.intake.record, {
      ...message("@jori help"),
      externalId: `linear:${mentioned}`,
      integration: "linear",
      mode: "record",
      ...(mentioned === undefined ? {} : { mentioned }),
    })
  }
  const stored = await t.run(
    async (ctx) => await ctx.db.query("messages").take(3)
  )
  expect(stored.map((item) => item.mentioned)).toEqual([false, false, true])
})

test("shared intake cannot reintroduce generic GitHub mentions", async () => {
  const t = convexTest(schema, modules)
  await seedIntegration(t)
  await t.mutation(internal.conversations.intake.record, {
    ...message("@jori-production-eu @jori"),
    integration: "github",
    mode: "record",
  })
  const stored = await t.run(
    async (ctx) => await ctx.db.query("messages").unique()
  )
  expect(stored?.mentioned).toBe(false)
})

function message(text: string) {
  return {
    accountId: "installation",
    type: "comment.issue.created",
    externalId: "delivery",
    conversationId: "test/repo#1",
    text,
  }
}

async function seedIntegration(
  t: ReturnType<typeof convexTest>,
  integration: "github" | "linear" = "github"
) {
  return await t.run(async (ctx) => {
    const createdBy = await ctx.db.insert("persons", {
      organizationId: "test",
      createdAt: 0,
      updatedAt: 0,
    })
    await ctx.db.insert("integrations", {
      organizationId: "test",
      createdBy,
      integration,
      externalId: "installation",
      credentials: {},
      scope: "organization",
      status: "active",
      createdAt: 0,
      updatedAt: 0,
      data: identity,
    })
    return createdBy
  })
}
