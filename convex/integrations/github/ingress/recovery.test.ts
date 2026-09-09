// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../../../_generated/api"
import schema from "../../../schema"
import { failedGitHubDeliveries } from "./recovery"

const now = Date.parse("2026-09-09T10:00:00Z")
const deliveredAt = "2026-09-09T09:50:00Z"
const modules = import.meta.glob("/convex/**/*.{ts,js}")
const claim = internal.integrations.github.ingress.recovery.claim

afterEach(() => vi.useRealTimers())

test("backs off repeated recovery attempts even if GitHub fails before acknowledging the request", async () => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  const t = convexTest(schema, modules)
  await seed(t)
  const delivery = { eventId: "event", installationId: "123" }
  expect(await t.mutation(claim, delivery)).toBe(true)
  expect(await t.mutation(claim, delivery)).toBe(false)
  vi.setSystemTime(now + 10 * 60 * 1000)
  expect(await t.mutation(claim, delivery)).toBe(true)
  vi.setSystemTime(now + 20 * 60 * 1000)
  expect(await t.mutation(claim, delivery)).toBe(false)
  vi.setSystemTime(now + 30 * 60 * 1000)
  expect(await t.mutation(claim, delivery)).toBe(true)
})

test("does not recover deliveries for another region or a revoked connection", async () => {
  const t = convexTest(schema, modules)
  const integrationId = await seed(t)
  expect(
    await t.mutation(claim, { eventId: "other", installationId: "456" })
  ).toBe(false)
  await t.run(
    async (ctx) => await ctx.db.patch(integrationId, { status: "expired" })
  )
  expect(
    await t.mutation(claim, { eventId: "revoked", installationId: "123" })
  ).toBe(false)
  expect(
    await t.run(async (ctx) => await ctx.db.query("githubRecoveries").take(1))
  ).toEqual([])
})

async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const createdBy = await ctx.db.insert("persons", {
      organizationId: "eu",
      createdAt: 0,
      updatedAt: 0,
    })
    return await ctx.db.insert("integrations", {
      createdBy,
      organizationId: "eu",
      integration: "github",
      externalId: "123",
      scope: "organization",
      status: "active",
      credentials: {},
      createdAt: 0,
      updatedAt: 0,
    })
  })
}

test("requests one redelivery per failed GUID, including delivery timeouts", () => {
  expect(
    failedGitHubDeliveries(
      [
        { id: 1, guid: "failed", status_code: 500, delivered_at: deliveredAt },
        { id: 2, guid: "failed", status_code: 500, delivered_at: deliveredAt },
        {
          id: 3,
          guid: "timeout",
          status_code: null,
          delivered_at: deliveredAt,
        },
      ],
      now
    ).map((delivery) => delivery.id)
  ).toEqual([1, 3])
})

test("does not replay recovered, pending or expired deliveries", () => {
  expect(
    failedGitHubDeliveries(
      [
        {
          id: 1,
          guid: "recovered",
          status_code: 500,
          delivered_at: deliveredAt,
        },
        {
          id: 2,
          guid: "recovered",
          status_code: 200,
          delivered_at: deliveredAt,
        },
        {
          id: 3,
          guid: "redirected",
          status_code: 302,
          delivered_at: deliveredAt,
        },
        {
          id: 4,
          guid: "pending",
          status_code: null,
          delivered_at: "2026-09-09T09:59:50Z",
        },
        {
          id: 5,
          guid: "expired",
          status_code: 500,
          delivered_at: "2026-09-01T09:50:00Z",
        },
        { id: 6, guid: "invalid", status_code: 500, delivered_at: "invalid" },
      ],
      now
    )
  ).toEqual([])
})
