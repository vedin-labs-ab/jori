// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { internal } from "../../../_generated/api"
import schema from "../../../schema"
import { hmacSha256Hex } from "../../../shared/crypto"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
vi.mock("../../../runs/execution/workflow", () => ({ startRun: vi.fn() }))
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv("LINEAR_WEBHOOK_SECRET", "synthetic-linear-secret")
  vi.stubEnv("LINEAR_CLIENT_ID", "client-eu")
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test("durably accepts before hydration and deduplicates retries or altered unsigned delivery headers", async () => {
  const { t } = await setup()
  const fetch = vi.fn().mockRejectedValue(new Error("offline"))
  vi.stubGlobal("fetch", fetch)
  const event = payload()
  expect(
    (await t.fetch("/linear/events", await request(event, "delivery-one")))
      .status
  ).toBe(200)
  expect(
    (await t.fetch("/linear/events", await request(event, "delivery-two")))
      .status
  ).toBe(200)
  expect(
    (
      await t.fetch(
        "/linear/events",
        await request(
          { ...event, webhookTimestamp: Date.now() + 1000 },
          "delivery-three"
        )
      )
    ).status
  ).toBe(200)
  expect(fetch).not.toHaveBeenCalled()
  expect(
    await t.run(async (ctx) => await ctx.db.query("webhookDeliveries").take(10))
  ).toHaveLength(1)
})

test("rejects a valid signature for a different OAuth client before accepting", async () => {
  const { t } = await setup()
  expect(
    (
      await t.fetch(
        "/linear/events",
        await request({ ...payload(), oauthClientId: "client-us" }, "delivery")
      )
    ).status
  ).toBe(401)
  expect(
    await t.run(async (ctx) => await ctx.db.query("webhookDeliveries").take(10))
  ).toEqual([])
})

test("pins queued notifications to their installed regional bot and workspace", async () => {
  const { t, integrationId } = await setup()
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  for (const changed of [
    { appUserId: "bot-us" },
    { organizationId: "other-workspace" },
  ]) {
    await t.action(internal.integrations.linear.ingress.delivery.process, {
      integrationId,
      connectionGeneration: 0,
      payload: {
        deliveryId: "delivery",
        event: {
          ...payload(),
          type: "AppUserNotification",
          action: "issueCommentMention",
          ...changed,
        },
      },
    })
  }
  expect(fetch).not.toHaveBeenCalled()
  expect(
    await t.run(async (ctx) => await ctx.db.query("messages").take(10))
  ).toEqual([])
})

async function request(event: object, deliveryId: string) {
  const body = JSON.stringify(event)
  return {
    method: "POST",
    headers: {
      "linear-signature": await hmacSha256Hex("synthetic-linear-secret", body),
      "linear-delivery": deliveryId,
    },
    body,
  }
}
function payload() {
  return {
    type: "Comment",
    action: "create",
    oauthClientId: "client-eu",
    organizationId: "workspace",
    webhookTimestamp: Date.now(),
    createdAt: "2026-09-09T12:00:00Z",
    data: { id: "comment", issueId: "issue", body: "Please help" },
  }
}
async function setup() {
  const t = convexTest(schema, modules)
  const integrationId = await t.run(async (ctx) => {
    const createdBy = await ctx.db.insert("persons", {
      organizationId: "test",
      createdAt: 0,
      updatedAt: 0,
    })
    return await ctx.db.insert("integrations", {
      organizationId: "test",
      createdBy,
      integration: "linear",
      externalId: "workspace",
      credentials: {
        tokens: { access: "synthetic-access", refresh: "synthetic-refresh" },
        expiresAt: Date.now() + 3_600_000,
      },
      scope: "organization",
      status: "active",
      createdAt: 0,
      updatedAt: 0,
      data: {
        botId: "bot-eu",
        botDisplayName: "jori-eu",
        botUrl: "https://linear.app/test/profiles/jori-eu",
      },
    })
  })
  return { t, integrationId }
}

test("does not ingest a prior grant's notification after reconnecting during hydration", async () => {
  const { t, integrationId } = await setup()
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      await t.run(
        async (ctx) =>
          await ctx.db.patch(integrationId, { connectionGeneration: 1 })
      )
      return Response.json({
        data: {
          comment: {
            id: "comment",
            body: "Please help",
            issue: { id: "issue" },
          },
        },
      })
    })
  )
  await t.action(internal.integrations.linear.ingress.delivery.process, {
    integrationId,
    connectionGeneration: 0,
    payload: {
      deliveryId: "delivery",
      event: {
        ...payload(),
        type: "AppUserNotification",
        action: "issueCommentMention",
        appUserId: "bot-eu",
        notification: { commentId: "comment", issueId: "issue" },
      },
    },
  })
  expect(
    await t.run(async (ctx) => await ctx.db.query("messages").take(10))
  ).toEqual([])
})
