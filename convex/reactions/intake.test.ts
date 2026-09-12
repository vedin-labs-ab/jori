// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "../_generated/api"
import schema from "../schema"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const key = "slack:message:C1:123.456"

test.each(["record", "sync"] as const)(
  "%s enriches a reaction from its message before persisting it",
  async (method) => {
    const { t, integrationId } = await setup()
    await t.run(async (ctx) => {
      await ctx.db.insert("messages", {
        organizationId: "org",
        integrationId,
        surface: "slack",
        type: "message.channels",
        externalId: "message",
        conversationId: "conversation",
        targetKey: key,
        mentioned: false,
        actor: { kind: "bot", externalId: "UBOT", name: "Jori" },
        text: "Stored reply",
        data: { channel: { id: "C1" }, ts: "123.456" },
        createdAt: 1,
      })
    })
    const args = {
      accountId: "T1",
      integration: "slack" as const,
      target: { key, identifiers: ["slack:channel:C1", "provided"] },
    }
    if (method === "record") {
      await t.mutation(internal.reactions.intake.record, {
        ...args,
        action: "added",
        reaction: "thumbsup",
      })
    } else {
      await t.mutation(internal.reactions.intake.sync, {
        ...args,
        reactions: [{ reaction: "thumbsup" }],
      })
    }
    const row = await t.run(async (ctx) => ctx.db.query("reactions").unique())
    expect(row?.target).toEqual({
      key,
      actor: { kind: "self", externalId: "UBOT", name: "Jori" },
      conversationId: "conversation",
      identifiers: [
        "slack:channel:C1",
        "provided",
        "slack:message:123.456",
        "slack:thread:123.456",
      ],
      text: "Stored reply",
    })
  }
)

test("a reaction without a stored message retains its supplied target", async () => {
  const { t } = await setup()
  const target = { key, identifiers: ["provided"], text: "Provided reply" }
  await t.mutation(internal.reactions.intake.record, {
    accountId: "T1",
    integration: "slack",
    action: "added",
    reaction: "thumbsup",
    target,
  })
  const row = await t.run(async (ctx) => ctx.db.query("reactions").unique())
  expect(row?.target).toEqual(target)
})

async function setup() {
  const t = convexTest(schema, modules)
  const integrationId = await t.run(async (ctx) => {
    const createdBy = await ctx.db.insert("persons", {
      organizationId: "org",
      createdAt: 1,
      updatedAt: 1,
    })
    return await ctx.db.insert("integrations", {
      organizationId: "org",
      integration: "slack",
      scope: "organization",
      externalId: "T1",
      data: { botUserId: "UBOT" },
      credentials: {},
      status: "active",
      createdBy,
      createdAt: 1,
      updatedAt: 1,
    })
  })
  return { t, integrationId }
}
