// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { api } from "../_generated/api"
import schema from "../schema"
import { stripeEnvironmentNames } from "./stripe/config"

const modules = import.meta.glob("/convex/{_generated,billing}/**/*.{ts,js}")
const organizationId = "organization-1"
const config = { thresholdUsd: 10, amountUsd: 25, monthlyCapUsd: 100 }

beforeEach(() => {
  for (const name of stripeEnvironmentNames) {
    vi.stubEnv(name, "")
  }
})
afterEach(() => vi.unstubAllEnvs())

test("read-only billing remains available to an organization without Stripe", async () => {
  const t = convexTest(schema, modules)
  const caller = t.withIdentity({ org: organizationId })
  expect(
    await caller.query(api.billing.console.overview, { organizationId })
  ).toEqual({ account: null, entries: [] })
})

test("enabling auto top-up fails before creating an account when Stripe is absent", async () => {
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

test("disabling auto top-up is allowed without Stripe", async () => {
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
    caller.action(api.billing.stripe.checkout.startPlanCheckout, {
      organizationId,
      businessPurchase: true,
      termsVersion: "2026-09-13",
      plan: "starter",
      interval: "month",
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
