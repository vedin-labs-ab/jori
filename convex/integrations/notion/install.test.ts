// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const record = internal.integrations.notion.install.recordOAuthInstallation

test("keeps an active Notion authorization when a second owner authorizes another bot", async () => {
  const { t, original, args, otherPerson } = await setup()
  expect(
    await t.mutation(record, {
      ...args,
      createdBy: otherPerson,
      accessToken: "second-token",
      profile: { ...args.profile, botId: "other-bot" },
    })
  ).toBeNull()
  expect(await t.run(async (ctx) => await ctx.db.get(original))).toMatchObject({
    createdBy: args.createdBy,
    credentials: { tokens: { access: args.accessToken } },
    data: { botId: args.profile.botId },
    status: "active",
  })
})

test("updates the same authorization without moving it to another Jori organization", async () => {
  const { t, original, args } = await setup()
  expect(
    await t.mutation(record, { ...args, accessToken: "renewed-token" })
  ).toBe(original)
  await expect(
    t.mutation(record, { ...args, organizationId: "other-organization" })
  ).rejects.toThrow("already connected to another organization")
  expect(await t.run(async (ctx) => await ctx.db.get(original))).toMatchObject({
    organizationId: args.organizationId,
    credentials: { tokens: { access: "renewed-token" } },
    data: { botId: args.profile.botId },
  })
})

async function setup() {
  const t = convexTest(schema, modules)
  const people = await t.run(async (ctx) => {
    const first = await ctx.db.insert("persons", {
      organizationId: "test",
      createdAt: 0,
      updatedAt: 0,
    })
    const second = await ctx.db.insert("persons", {
      organizationId: "test",
      createdAt: 0,
      updatedAt: 0,
    })
    return [first, second] as const
  })
  const args = {
    organizationId: "test",
    createdBy: people[0],
    accessToken: "first-token",
    profile: {
      botId: "bot-eu",
      workspaceId: "workspace",
      workspaceName: "Jori test",
    },
  }
  const original = await t.mutation(record, args)
  if (original === null) {
    throw new Error("Expected first installation")
  }
  return { t, args, original, otherPerson: people[1] }
}
