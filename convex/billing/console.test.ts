// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { api } from "../_generated/api"
import schema from "../schema"
import { polarEnvironmentNames } from "./polar/config"

const modules = import.meta.glob("/convex/{_generated,billing}/**/*.{ts,js}")
const organizationId = "organization-1"
const config = { thresholdUsd: 10, amountUsd: 25, monthlyCapUsd: 100 }

beforeEach(() => {
  for (const name of polarEnvironmentNames) {
    vi.stubEnv(name, "")
  }
})
afterEach(() => vi.unstubAllEnvs())

test("read-only billing remains available to an organization without Polar", async () => {
  const t = convexTest(schema, modules)
  const caller = t.withIdentity({ org: organizationId })
  expect(
    await caller.query(api.billing.console.overview, { organizationId })
  ).toEqual({ account: null, entries: [] })
})

test("enabling auto top-up fails before creating an account when Polar is absent", async () => {
  const t = convexTest(schema, modules)
  const caller = t.withIdentity({ org: organizationId })
  await expect(
    caller.mutation(api.billing.console.configureAutoTopUp, {
      organizationId,
      config,
    })
  ).rejects.toThrow("Billing is not available in this instance yet.")
  expect(
    await t.run(async (ctx) => await ctx.db.query("accounts").take(1))
  ).toEqual([])
})

test("disabling auto top-up is allowed without Polar", async () => {
  const t = convexTest(schema, modules)
  const caller = t.withIdentity({ org: organizationId })
  await expect(
    caller.mutation(api.billing.console.configureAutoTopUp, {
      organizationId,
      config: null,
    })
  ).resolves.toBeNull()
})

test("a signed-in waitlisted caller without an organization cannot use billing APIs", async () => {
  const t = convexTest(schema, modules)
  const caller = t.withIdentity({ email: "waiting@example.com" })
  await expect(
    caller.query(api.billing.console.overview, { organizationId })
  ).rejects.toThrow("no active organization")
  await expect(
    caller.mutation(api.billing.console.configureAutoTopUp, {
      organizationId,
      config,
    })
  ).rejects.toThrow("no active organization")
  await expect(
    caller.action(api.billing.polar.checkout.startPlanCheckout, {
      organizationId,
      businessPurchase: true,
      termsVersion: "2026-09-19",
      returnUrl: "https://eu.usejori.com/console",
    })
  ).rejects.toThrow("no active organization")
})

test("billing readiness never bypasses organization authorization", async () => {
  const t = convexTest(schema, modules)
  const caller = t.withIdentity({ org: "another-organization" })
  await expect(
    caller.query(api.billing.console.overview, { organizationId })
  ).rejects.toThrow("another organization")
  await expect(
    t.query(api.billing.console.overview, { organizationId })
  ).rejects.toThrow("Sign in")
})

test.each([
  {
    kind: "paused",
    subscriptionId: undefined,
    refundHold: undefined,
    expected: true,
  },
  {
    kind: "active",
    subscriptionId: "subscription",
    refundHold: undefined,
    expected: false,
  },
  {
    kind: "paused",
    subscriptionId: "subscription",
    refundHold: undefined,
    expected: false,
  },
  {
    kind: "paused",
    subscriptionId: undefined,
    refundHold: "support-case",
    expected: false,
  },
  {
    kind: "unsubscribed",
    subscriptionId: undefined,
    refundHold: undefined,
    expected: true,
  },
] as const)(
  "checkout eligibility follows the current subscription and support hold: $kind/$subscriptionId/$refundHold",
  async ({ kind, subscriptionId, refundHold, expected }) => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert("accounts", {
        organizationId,
        state: { kind },
        micros: { allowance: 0, wallet: 15_000_000 },
        topUp: { charged: { micros: 0 } },
        polar: { customerId: "customer", subscriptionId },
        refundHold,
        updatedAt: 1,
      })
    })
    const overview = await t
      .withIdentity({ org: organizationId })
      .query(api.billing.console.overview, { organizationId })
    expect(overview.account?.canSubscribe).toBe(expected)
    expect(overview.account?.hasCustomer).toBe(true)
  }
)
