// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"
import { hmacSha256Hex } from "../../shared/crypto"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv("NOTION_WEBHOOK_VERIFICATION_TOKEN", "synthetic-notion-secret")
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test("acknowledges a signed event after durable intake without fetching page content", async () => {
  const { t } = await setup()
  const fetch = vi.fn().mockRejectedValue(new Error("offline"))
  vi.stubGlobal("fetch", fetch)
  const body = JSON.stringify(payload())
  const request = {
    method: "POST",
    headers: {
      "x-notion-signature": `sha256=${await hmacSha256Hex("synthetic-notion-secret", body)}`,
    },
    body,
  }
  expect((await t.fetch("/notion/events", request)).status).toBe(200)
  expect((await t.fetch("/notion/events", request)).status).toBe(200)
  expect(fetch).not.toHaveBeenCalled()
  const deliveries = await t.run(
    async (ctx) => await ctx.db.query("webhookDeliveries").take(10)
  )
  expect(deliveries).toHaveLength(1)
  expect(deliveries[0]).toMatchObject({
    provider: "notion",
    eventId: "event",
    status: "queued",
  })
})

test("does not record an event through another workspace connection", async () => {
  const { t, integrationId } = await setup()
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  await t.action(internal.integrations.notion.delivery.process, {
    integrationId,
    connectionGeneration: 0,
    payload: { ...payload(), workspace_id: "other-workspace" },
  })
  expect(fetch).not.toHaveBeenCalled()
  expect(
    await t.run(async (ctx) => await ctx.db.query("events").take(10))
  ).toEqual([])
})

test("retries page hydration outages and marks revoked access expired", async () => {
  const { t, integrationId } = await setup()
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("private response body", { status: 503 }))
  )
  await expect(
    t.action(internal.integrations.notion.delivery.process, {
      integrationId,
      connectionGeneration: 0,
      payload: payload(),
    })
  ).rejects.toThrow("Notion API request failed (503)")
  expect(
    await t.run(async (ctx) => await ctx.db.query("events").take(10))
  ).toEqual([])
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("private response body", { status: 401 }))
  )
  await t.action(internal.integrations.notion.delivery.process, {
    integrationId,
    connectionGeneration: 0,
    payload: payload(),
  })
  expect(
    (await t.run(async (ctx) => await ctx.db.get(integrationId)))?.status
  ).toBe("expired")
})

test("an in-flight unauthorized response cannot expire a reconnected grant with the same token", async () => {
  const { t, integrationId } = await setup()
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      await t.run(
        async (ctx) =>
          await ctx.db.patch(integrationId, {
            connectionGeneration: 1,
          })
      )
      return new Response("private response body", { status: 401 })
    })
  )
  await t.action(internal.integrations.notion.delivery.process, {
    integrationId,
    connectionGeneration: 0,
    payload: payload(),
  })
  expect(
    (await t.run(async (ctx) => await ctx.db.get(integrationId)))?.status
  ).toBe("active")
})

function payload() {
  return {
    id: "event",
    type: "page.content_updated",
    workspace_id: "workspace",
    entity: { id: "page", type: "page" },
    authors: [{ id: "person", type: "person" }],
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
      integration: "notion",
      externalId: "workspace",
      credentials: { tokens: { access: "synthetic-access" } },
      scope: "organization",
      status: "active",
      createdAt: 0,
      updatedAt: 0,
      data: { botId: "bot" },
    })
  })
  return { t, integrationId }
}

test("does not ingest a prior grant's event after reconnecting during hydration", async () => {
  const { t, integrationId } = await setup()
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      await t.run(
        async (ctx) =>
          await ctx.db.patch(integrationId, { connectionGeneration: 1 })
      )
      return Response.json({ id: "page", url: "https://notion.so/page" })
    })
  )
  await t.action(internal.integrations.notion.delivery.process, {
    integrationId,
    connectionGeneration: 0,
    payload: payload(),
  })
  expect(
    await t.run(async (ctx) => await ctx.db.query("events").take(10))
  ).toEqual([])
})
