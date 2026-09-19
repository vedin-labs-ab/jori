// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { internal } from "../_generated/api"
import { ensureAccount } from "../billing/account"
import schema from "../schema"
import { assertWorkspaceAvailable } from "./access"
import { dayMs, findRetention, resumeWorkspace, retainWorkspace } from "./data"
import { beginDeletion } from "./deletion"
import { contentTables } from "./erasure/tables"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-12T10:00:00Z"))
})
afterEach(() => vi.useRealTimers())

test("retention starts at effective expiry, repeats do not extend it, and reactivation cancels it", async () => {
  const t = convexTest(schema, modules)
  const endedAt = Date.now() - dayMs
  await t.run(async (ctx) => {
    await retainWorkspace(ctx, "org", endedAt)
    await retainWorkspace(ctx, "org", Date.now())
    expect(await findRetention(ctx, "org")).toMatchObject({
      endedAt,
      deletesAt: endedAt + 90 * dayMs,
      state: "retained",
    })
    await assertWorkspaceAvailable(ctx, "org")
    await resumeWorkspace(ctx, "org")
    expect(await findRetention(ctx, "org")).toBeNull()
  })
})

test("deletion denies stale sessions and cannot be reversed by delayed subscription events", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    await beginDeletion(ctx, "org")
    await expect(assertWorkspaceAvailable(ctx, "org")).rejects.toThrow(
      "deleted"
    )
    await resumeWorkspace(ctx, "org")
    expect(await findRetention(ctx, "org")).toMatchObject({ state: "deleting" })
    await assertWorkspaceAvailable(ctx, "other")
  })
})

test("active subscriptions and purchased balances require settlement before deletion", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    const account = await ensureAccount(ctx, "org")
    await ctx.db.patch(account._id, {
      state: { kind: "active" },
    })
    await expect(beginDeletion(ctx, "org")).rejects.toThrow("Cancel")
    await ctx.db.patch(account._id, {
      state: { kind: "paused" },
      micros: { allowance: 0, wallet: 10 },
    })
    await expect(beginDeletion(ctx, "org")).rejects.toThrow("unused purchased")
    expect(await findRetention(ctx, "org")).toBeNull()
    await beginDeletion(ctx, "org", true)
    expect(await ctx.db.get(account._id)).toMatchObject({
      micros: { wallet: 10 },
    })
    expect(await findRetention(ctx, "org")).toMatchObject({ state: "deleting" })
  })
})

test("a late accepted notice still leaves seven full days before automatic deletion", async () => {
  const t = convexTest(schema, modules)
  const id = await t.run(async (ctx) => {
    const noticeId = await ctx.db.insert("emailSubmissions", {
      organizationId: "org",
      region: "eu",
      status: "accepted",
      attempts: 1,
      expiresAt: Date.now() + dayMs,
    })
    return await ctx.db.insert("workspaceRetention", {
      organizationId: "org",
      state: "retained",
      endedAt: Date.now() - 100 * dayMs,
      deletesAt: Date.now() - 10 * dayMs,
      nextAt: Date.now(),
      noticeId,
    })
  })
  await t.mutation(internal.retention.sweep.run, {})
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toMatchObject({
    state: "retained",
    noticeAt: Date.now(),
    deletesAt: Date.now() + 7 * dayMs,
  })
})

test("every app table has an explicit deletion or retention policy", () => {
  const excluded = [
    "accounts",
    "billingRefunds",
    "billingCancellations",
    "transactions",
    "workspaceRetention",
    "sandboxes",
    "githubRecoveries",
    "notionWebhookSetups",
    "allowlist",
    "waitlist",
    "models",
    "discoveryScans",
    // The blob sweep keeps issued keys until uploads can no longer arrive.
    "uploads",
  ]
  expect(Object.keys(schema.tables).sort()).toEqual(
    [...contentTables, ...excluded].sort()
  )
})

test("renewal cancellation does not start retention until Polar reports the effective end", async () => {
  const t = convexTest(schema, modules)
  vi.stubEnv("JORI_REGION", "eu")
  const endedAt = Date.now() - 60_000
  await t.run(async (ctx) => {
    const account = await ensureAccount(ctx, "org")
    await ctx.db.patch(account._id, {
      state: { kind: "active" },
      polar: { customerId: "customer_test", subscriptionId: "sub_test" },
    })
  })
  const subscription = {
    id: "sub_test",
    customer_id: "customer_test",
    metadata: { region: "eu", organizationId: "org" },
    status: "active",
    cancel_at_period_end: true,
  }
  await t.mutation(internal.billing.polar.events.apply, { subscription })
  expect(await t.run(async (ctx) => await findRetention(ctx, "org"))).toBeNull()
  await t.mutation(internal.billing.polar.events.apply, {
    subscription: {
      ...subscription,
      status: "canceled",
      ended_at: new Date(endedAt).toISOString(),
    },
  })
  expect(
    await t.run(async (ctx) => await findRetention(ctx, "org"))
  ).toMatchObject({ endedAt, deletesAt: endedAt + 90 * dayMs })
  vi.unstubAllEnvs()
})
