// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import schema from "../../schema"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const inspection = internal.integrations.inspection

test("operator inspection exposes verification metadata without credentials or customer content", async () => {
  const t = convexTest(schema, modules)
  const integrationId = await seedConnection(t)
  const messageId = await seedObservations(t, integrationId)
  const runId = await seedRun(t, messageId)
  const results = await Promise.all([
    t.query(inspection.connections.list, { provider: "github" }),
    t.query(inspection.connections.receipts, {}),
    t.query(inspection.activity.messages, { integrationId }),
    t.query(inspection.activity.events, { integrationId }),
    t.query(inspection.activity.runs, { organizationId: "test-eu" }),
    t.query(inspection.activity.actions, { runId }),
  ])
  expect(JSON.stringify(results)).not.toContain("private-")
  expect(results[0].page[0]).toMatchObject({
    identity: { appSlug: "jori-eu", botUserId: "101" },
  })
  expect(results[2].page[0]).toMatchObject({
    bot: { id: "101", name: "jori-eu[bot]" },
    references: { repository: "jori/test" },
  })
  expect(results[4].page[0]).toMatchObject({
    id: runId,
    status: "failed",
    messageId,
  })
  expect(results[5].page[0]).toMatchObject({
    type: "tool.failed",
    tool: "github_create_comment",
  })
})

async function seedConnection(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const createdBy = await ctx.db.insert("persons", {
      organizationId: "test-eu",
      createdAt: 0,
      updatedAt: 0,
    })
    return await ctx.db.insert("integrations", {
      createdBy,
      organizationId: "test-eu",
      integration: "github",
      externalId: "123",
      status: "active",
      scope: "organization",
      createdAt: 0,
      updatedAt: 0,
      credentials: { access: "private-secret" },
      data: {
        appSlug: "jori-eu",
        botUserId: "101",
        arbitrary: "private-content",
      },
    })
  })
}

async function seedObservations(
  t: ReturnType<typeof convexTest>,
  integrationId: Id<"integrations">
) {
  return await t.run(async (ctx) => {
    await ctx.db.insert("webhookDeliveries", {
      provider: "github",
      eventId: "delivery",
      organizationId: "test-eu",
      integrationId,
      connectionGeneration: 0,
      attempts: 1,
      expiresAt: 100,
      status: "failed",
      payload: { content: "private-content", secret: "private-secret" },
    })
    const messageId = await ctx.db.insert("messages", {
      organizationId: "test-eu",
      integrationId,
      surface: "github",
      type: "comment.issue.created",
      externalId: "message",
      conversationId: "jori/test#1",
      mentioned: true,
      actor: { kind: "self", externalId: "101", name: "jori-eu[bot]" },
      text: "private-content",
      data: { repository: { fullName: "jori/test" }, body: "private-content" },
      createdAt: 0,
    })
    await ctx.db.insert("events", {
      organizationId: "test-eu",
      integrationId,
      key: "event",
      type: "issue.opened",
      text: "private-content",
      data: {
        repository: { fullName: "jori/test" },
        issue: { title: "private-content" },
      },
    })
    return messageId
  })
}

async function seedRun(
  t: ReturnType<typeof convexTest>,
  messageId: Id<"messages">
) {
  return await t.run(async (ctx) => {
    const runId = await ctx.db.insert("runs", {
      organizationId: "test-eu",
      audience: "organization",
      cause: { type: "message", kind: "mention", messageId },
      principal: { kind: "organization" },
      status: "failed",
      createdAt: 0,
      instructions: "private-content",
      result: "private-content",
      error: "private-secret",
      snapshot: {
        title: "private-content",
        source: { type: "message", surface: "github", url: "private-url" },
        context: [],
      },
    })
    await ctx.db.insert("traces", {
      runId,
      organizationId: "test-eu",
      type: "tool.failed",
      key: "trace",
      timestamp: 1,
      sequence: 1,
      callId: "call",
      data: {
        tool: {
          name: "github_create_comment",
          access: "write",
          route: "convex",
        },
        input: { text: "private-content" },
        error: "private-secret",
      },
    })
    return runId
  })
}
