// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, vi } from "vitest"
import { api } from "../../convex/_generated/api"
import { polarList, polarRequest } from "../../convex/billing/polar/client"
import { polarEnvironmentNames } from "../../convex/billing/polar/config"
import schema from "../../convex/schema"

vi.mock("../../convex/billing/polar/client", async (original) => ({
  ...(await original<typeof import("../../convex/billing/polar/client")>()),
  polarList: vi.fn(),
  polarRequest: vi.fn(),
}))
const modules = import.meta.glob("/convex/**/*.{ts,js}")
export const organizationId = "checkout-test"
const common = {
  organizationId,
  returnUrl: "https://eu.usejori.com/console",
  businessPurchase: true as const,
  termsVersion: "2026-09-19" as const,
}
export const provider = {
  checkouts: [] as Record<string, unknown>[],
  subscriptions: [] as Record<string, unknown>[],
  lostResponse: false,
}
beforeEach(() => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("JORI_APP_URL", "https://eu.usejori.com")
  for (const name of polarEnvironmentNames) {
    vi.stubEnv(name, "test-configured")
  }
  vi.stubEnv("POLAR_PRODUCT_CLOUD", "plan_product")
  vi.stubEnv("POLAR_PRODUCT_STORAGE", "storage_product")
  vi.stubEnv("POLAR_PRODUCT_TOP_UP", "topup_product")
  provider.checkouts = []
  provider.subscriptions = []
  provider.lostResponse = false
  vi.mocked(polarList)
    .mockReset()
    .mockImplementation(async (path, query) => {
      const rows =
        path === "/v1/subscriptions/"
          ? provider.subscriptions
          : provider.checkouts
      return rows.filter(
        (item) =>
          item.product_id === query.product_id &&
          (!query.status ||
            (query.status as string[]).includes(String(item.status)))
      )
    })
  vi.mocked(polarRequest)
    .mockReset()
    .mockImplementation(async (path, options) => {
      if (options?.method === "POST") {
        const body = options.body ?? {}
        const checkout = {
          id: `checkout-${provider.checkouts.length}`,
          url: `https://polar.test/${provider.checkouts.length}`,
          status: "open",
          customer_id: body.customer_id,
          product_id: (body.products as string[])[0],
          metadata: body.metadata,
          units: body.units,
        }
        provider.checkouts.push(checkout)
        if (provider.lostResponse) {
          throw new Error("Connection lost")
        }
        return checkout
      }
      const checkout = provider.checkouts.find((item) =>
        path.endsWith(`/${item.id}`)
      )
      if (!checkout) {
        throw new Error("Checkout not found")
      }
      if (options?.method === "PATCH") {
        Object.assign(checkout, options.body)
      }
      return checkout
    })
})
afterEach(() => vi.unstubAllEnvs())
export async function fixture(active = false) {
  const t = convexTest(schema, modules)
  const accountId = await t.run(
    async (ctx) =>
      await ctx.db.insert("accounts", {
        organizationId,
        state: { kind: active ? "active" : "unsubscribed" },
        polar: { customerId: "customer" },
        micros: { allowance: 0, wallet: 0 },
        topUp: { charged: { micros: 0 } },
        updatedAt: 0,
      })
  )
  const user = t.withIdentity({
    subject: "owner",
    org: organizationId,
    email: "test@example.com",
  })
  return {
    t,
    accountId,
    plan: () =>
      user.action(api.billing.polar.checkout.startPlanCheckout, common),
    storage: (extraGb = 30) =>
      user.action(api.billing.storage.actions.checkout, { ...common, extraGb }),
    topup: () =>
      user.action(api.billing.polar.checkout.startTopUpCheckout, {
        ...common,
        amountUsd: 25,
      }),
  }
}
export const posts = () =>
  vi
    .mocked(polarRequest)
    .mock.calls.filter(([, args]) => args?.method === "POST")

export function checkout() {
  const row = provider.checkouts[0]
  if (row === undefined) {
    throw new Error("Expected a provider checkout")
  }
  return row
}

export const requests = vi.mocked(polarRequest)
export const lists = vi.mocked(polarList)
