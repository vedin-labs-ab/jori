// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"
import { mentionsLinearApp } from "./ingress/messages"

const modules = import.meta.glob("/convex/**/*.{ts,js}")

test("refreshing a renamed profile preserves the connection and credentials", async () => {
  const { t } = await setup("eu")
  const original = await t.run(
    async (ctx) => await ctx.db.query("integrations").unique()
  )
  if (original === null) {
    throw new Error("Expected integration")
  }
  const renamed = {
    integrationId: original._id,
    workspaceId: "workspace",
    botId: "bot-eu",
    botDisplayName: "jori-eu",
    botUrl: "https://linear.app/vedin-labs/profiles/jori-eu",
  }
  await t.mutation(internal.integrations.linear.profile.save, renamed)
  const updated = await t.run(async (ctx) => await ctx.db.get(original._id))
  expect(updated).toMatchObject({
    _id: original._id,
    credentials: original.credentials,
    status: "active",
    data: { botId: "bot-eu", botDisplayName: "jori-eu" },
  })
  expect(mentionsLinearApp("@jori-eu", updated?.data)).toBe(true)
  expect(mentionsLinearApp("@jori-production-eu", updated?.data)).toBe(false)
  await expect(
    t.mutation(internal.integrations.linear.profile.save, {
      ...renamed,
      workspaceId: "other-workspace",
    })
  ).rejects.toThrow("identity changed")
  await expect(
    t.mutation(internal.integrations.linear.profile.save, {
      ...renamed,
      botId: "bot-us",
    })
  ).rejects.toThrow("identity changed")
})

test("revocation expires the local connection but ignores events preceding a reinstall", async () => {
  const { t } = await setup("eu")
  const original = await t.run(
    async (ctx) => await ctx.db.query("integrations").unique()
  )
  if (original === null) {
    throw new Error("Expected integration")
  }
  await t.run(
    async (ctx) =>
      await ctx.db.patch(original._id, {
        data: { ...identity("eu"), installedAt: 100 },
      })
  )
  await t.mutation(internal.integrations.linear.profile.revoke, {
    integrationId: original._id,
    observedAt: 99,
  })
  expect(
    (await t.run(async (ctx) => await ctx.db.get(original._id)))?.status
  ).toBe("active")
  await t.mutation(internal.integrations.linear.profile.revoke, {
    integrationId: original._id,
    observedAt: 101,
  })
  expect(
    (await t.run(async (ctx) => await ctx.db.get(original._id)))?.status
  ).toBe("expired")
})

function identity(region: string) {
  return {
    botId: `bot-${region}`,
    botDisplayName: `jori-production-${region}`,
    botUrl: `https://linear.app/vedin-labs/profiles/jori-production-${region}`,
  }
}
async function setup(region: string) {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
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
  })
  return { t }
}
