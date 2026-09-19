/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { vi } from "vitest"
import { internal } from "../../convex/_generated/api"
import { polarEnvironmentNames } from "../../convex/billing/polar/config"
import schema from "../../convex/schema"

import { mockPolar } from "./polar"

const modules = import.meta.glob("/convex/{_generated,billing}/**/*.{ts,js}")
export const args = {
  organizationId: "org-eu",
  caseId: "support-123",
  orderId: "order_original",
  amountMinor: 2500,
  currency: "usd",
  allowanceMicros: 10_000_000,
  walletMicros: 0,
  calculation:
    "First payment 3000 cents; paid included usage 500 cents; free usage excluded; no tax or discounts.",
  operator: "Albin",
}
export async function setup() {
  const t = convexTest(schema, modules)
  const id = await t.run(
    async (ctx) =>
      await ctx.db.insert("accounts", {
        organizationId: args.organizationId,
        state: { kind: "paused" },
        micros: { allowance: 10_000_000, wallet: 40_000_000 },
        topUp: { charged: { micros: 0 } },
        polar: { customerId: "customer_org" },
        updatedAt: 1,
      })
  )
  for (const name of polarEnvironmentNames) {
    vi.stubEnv(name, "test_fixture")
  }
  vi.stubEnv("POLAR_SERVER", "sandbox")
  mockPolar()
  await t.run(
    async (ctx) =>
      await ctx.db.insert("transactions", {
        organizationId: args.organizationId,
        type: "topup",
        timestamp: 0,
        micros: { amount: 40_000_000, balance: 50_000_000 },
        orderId: "order_original",
        auto: true,
      })
  )
  return { t, id }
}

export async function freezeSettled(t: Awaited<ReturnType<typeof setup>>["t"]) {
  await t.mutation(internal.billing.refunds.data.freeze, {
    organizationId: args.organizationId,
    caseId: args.caseId,
  })
  await t.run(async (ctx) => {
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique()
    if (account !== null) {
      await ctx.db.patch(account._id, {
        refundHeldAt: Date.now() - 35 * 60_000,
      })
    }
  })
}
