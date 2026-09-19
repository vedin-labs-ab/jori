// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import schema from "../../schema"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const inspection = internal.integrations.inspection.slack
const botUserId = "U0C0CU19WLU"
const channelId = "D0C12345678"

afterEach(() => vi.unstubAllEnvs())

test("Slack migration inspection returns scoped dependencies without private content or guessed card authors", async () => {
  vi.stubEnv("JORI_REGION", "eu")
  const t = convexTest(schema, modules)
  const integrationId = await seedConnection(t)
  await seedDependencies(t, integrationId)
  const args = { integrationId, botUserId, channelIds: [channelId] }
  const results = await Promise.all([
    t.query(inspection.jobs, args),
    t.query(inspection.approvals, { integrationId }),
    t.query(inspection.offers, { integrationId }),
    t.query(inspection.subscriptions, args),
    t.query(inspection.identity, { integrationId }),
  ])
  expect(JSON.stringify(results)).not.toContain("private-")
  expect(results[0].integration).toMatchObject({
    id: integrationId,
    region: "eu",
    botUserId,
    connectionGeneration: 2,
  })
  expect(results[0].page).toHaveLength(1)
  expect(results[0].page[0]).toMatchObject({
    hasSlackAccess: true,
    referencesBot: true,
    referencedChannelIds: [channelId],
  })
  expect(results[1].page[0]).toMatchObject({
    pending: true,
    delivery: {
      channelId,
      isDirectMessage: true,
      authorIdentityRecorded: false,
    },
  })
  expect(results[2].page[0]).toMatchObject({
    pending: true,
    delivery: { channelId, authorIdentityRecorded: false },
  })
  expect(results[3].page[0]).toMatchObject({
    status: "active",
    referencesBot: true,
    referencedChannelIds: [channelId],
  })
  expect(results[4].page[0]).toMatchObject({
    externalId: botUserId,
    hasCachedName: true,
    hasCachedEmail: true,
  })
})

test("migration pages remain bounded and exclude another organization's jobs and cards", async () => {
  vi.stubEnv("JORI_REGION", "us")
  const t = convexTest(schema, modules)
  const integrationId = await seedConnection(t)
  const otherId = await seedConnection(t, "other")
  await seedDependencies(t, otherId, "other")
  for (let i = 0; i < 26; i++) {
    await seedDependencies(t, integrationId)
  }
  for (const query of [
    inspection.jobs,
    inspection.approvals,
    inspection.offers,
  ]) {
    const first = await t.query(query, { integrationId })
    expect(first.page).toHaveLength(25)
    expect(first.isDone).toBe(false)
    const second = await t.query(query, {
      integrationId,
      cursor: first.continueCursor,
    })
    expect(second.page).toHaveLength(1)
    expect(second.isDone).toBe(true)
  }
})

test("migration inspection rejects non-Slack connections and arbitrary reference strings", async () => {
  vi.stubEnv("JORI_REGION", "eu")
  const t = convexTest(schema, modules)
  const integrationId = await seedConnection(t)
  await expect(
    t.query(inspection.jobs, { integrationId, channelIds: ["private-content"] })
  ).rejects.toThrow("Slack channel IDs")
  await expect(
    t.query(inspection.identity, { integrationId, botUserId: "private-secret" })
  ).rejects.toThrow("Slack bot user ID")
  await t.run(async (ctx) => {
    await ctx.db.patch(integrationId, { integration: "github" })
  })
  await expect(t.query(inspection.offers, { integrationId })).rejects.toThrow(
    "Slack integration not found"
  )
})

async function seedConnection(
  t: ReturnType<typeof convexTest>,
  organizationId = "test-eu"
) {
  return await t.run(async (ctx) => {
    const createdBy = await ctx.db.insert("persons", {
      organizationId,
      createdAt: 0,
      updatedAt: 0,
    })
    return await ctx.db.insert("integrations", {
      createdBy,
      organizationId,
      integration: "slack",
      externalId: "T0123456789",
      status: "active",
      scope: "organization",
      createdAt: 0,
      updatedAt: 0,
      connectionGeneration: 2,
      credentials: { access: "private-secret" },
      data: { appId: "A0123456789", botUserId, extra: "private-content" },
    })
  })
}

async function seedDependencies(
  t: ReturnType<typeof convexTest>,
  integrationId: Id<"integrations">,
  organizationId = "test-eu"
) {
  await t.run(async (ctx) => {
    await seedJob(ctx, integrationId, organizationId)
    await seedCards(ctx, integrationId, organizationId)
    await seedIdentity(ctx, integrationId, organizationId)
  })
}

async function seedJob(
  ctx: MutationCtx,
  integrationId: Id<"integrations">,
  organizationId: string
) {
  await ctx.db.insert("jobs", {
    organizationId,
    name: "private-content",
    instructions: `private-content ${botUserId} ${channelId}`,
    visibility: { mode: "organization" },
    principal: { kind: "organization" },
    type: "once",
    access: {
      integrations: [{ id: integrationId, tools: ["send_reply"] }],
      jori: [],
    },
    trigger: { at: Date.now() + 60_000 },
    status: "active",
    createdAt: 0,
    updatedAt: 0,
  })
}

async function seedRun(ctx: MutationCtx, organizationId: string) {
  return await ctx.db.insert("runs", {
    organizationId,
    audience: "organization",
    cause: { type: "manual" },
    principal: { kind: "organization" },
    status: "running",
    createdAt: 0,
    instructions: "private-content",
    snapshot: {
      title: "private-content",
      source: { type: "manual", surface: "jori" },
      context: [],
    },
  })
}

async function seedCards(
  ctx: MutationCtx,
  integrationId: Id<"integrations">,
  organizationId: string
) {
  const runId = await seedRun(ctx, organizationId)
  const delivery = {
    integration: "slack" as const,
    integrationId,
    data: { channelId, messageTs: "123.456", threadTs: "123.456" },
  }
  await ctx.db.insert("approvals", {
    organizationId,
    runId,
    surface: "slack",
    tool: "slack_send_message",
    args: "private-secret",
    summary: "private-content",
    code: "private-code",
    status: "pending",
    requestedBy: { kind: "self", externalId: botUserId },
    createdAt: 0,
    expiresAt: Date.now() + 60_000,
    delivery,
  })
  await ctx.db.insert("integrationOffers", {
    organizationId,
    integration: "linear",
    tokenHash: "private-secret",
    summary: "private-content",
    status: "pending",
    source: { surface: "slack", integrationId, runId },
    runId,
    delivery,
    expiresAt: Date.now() + 60_000,
    createdAt: 0,
    updatedAt: 0,
  })
}

async function seedIdentity(
  ctx: MutationCtx,
  integrationId: Id<"integrations">,
  organizationId: string
) {
  await ctx.db.insert("subscriptions", {
    organizationId,
    integrationId,
    event: "message.im",
    match: { channel: channelId, actor: botUserId, body: "private-content" },
    externalId: "private-reference",
    error: "private-secret",
    status: "active",
    createdAt: 0,
    updatedAt: 0,
  })
  const personId = await ctx.db.insert("persons", {
    organizationId,
    createdAt: 0,
    updatedAt: 0,
  })
  await ctx.db.insert("identities", {
    organizationId,
    personId,
    provider: "slack",
    externalId: botUserId,
    name: "private-content",
    email: "private-email",
    link: { method: "observed", at: 0, evidence: "private-secret" },
    createdAt: 0,
    updatedAt: 0,
  })
}
