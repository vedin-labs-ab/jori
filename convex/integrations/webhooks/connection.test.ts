// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"

const modules = import.meta.glob("/convex/**/*.{ts,js}")

async function setup() {
  const t = convexTest(schema, modules)
  const integrationId = await t.run(async (ctx) => {
    const createdBy = await ctx.db.insert("persons", {
      organizationId: "org",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return await ctx.db.insert("integrations", {
      organizationId: "org",
      integration: "slack",
      scope: "organization",
      externalId: "TTEST",
      credentials: {},
      status: "active",
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
  return { t, integrationId }
}

test("final provider mutations reject an event whose connection changed during enrichment", async () => {
  const { t, integrationId } = await setup()
  await t.run(
    async (ctx) =>
      await ctx.db.patch(integrationId, { connectionGeneration: 1 })
  )
  expect(
    await t.mutation(internal.conversations.intake.record, {
      integration: "slack",
      accountId: "TTEST",
      expectedConnectionGeneration: 0,
      type: "message.im",
      externalId: "old-message",
      conversationId: "thread",
      mentioned: true,
      text: "Do something",
      actor: { kind: "person", externalId: "UTEST" },
    })
  ).toEqual({ status: "missing_integration" })
  expect(
    await t.mutation(internal.events.ingest.recordFromProvider, {
      integration: "slack",
      externalId: "TTEST",
      expectedConnectionGeneration: 0,
      key: "old-event",
      type: "message.im",
      text: "Do something",
    })
  ).toEqual({ status: "missing_integration" })
  expect(
    await t.mutation(internal.reactions.intake.record, {
      integration: "slack",
      accountId: "TTEST",
      expectedConnectionGeneration: 0,
      action: "added",
      reaction: "thumbsup",
      target: { key: "old-message", identifiers: [] },
    })
  ).toEqual({ status: "missing_integration" })
  expect(
    await t.run(async (ctx) => await ctx.db.query("messages").collect())
  ).toHaveLength(0)
  expect(
    await t.run(async (ctx) => await ctx.db.query("events").collect())
  ).toHaveLength(0)
  expect(
    await t.run(async (ctx) => await ctx.db.query("reactions").collect())
  ).toHaveLength(0)
})
