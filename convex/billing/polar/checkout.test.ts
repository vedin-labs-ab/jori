import { getFunctionName } from "convex/server"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type ActionCtx } from "../../_generated/server"
import { openPortal, startPlanCheckout, startTopUpCheckout } from "./checkout"
import { polarRequest } from "./client"
import { polarEnvironmentNames } from "./config"

vi.mock("./client", async (original) => ({
  ...(await original<typeof import("./client")>()),
  polarRequest: vi.fn(async () => ({
    url: "https://polar.test",
    customer_portal_url: "https://polar.test/portal",
  })),
}))

const common = {
  businessPurchase: true,
  termsVersion: "2026-09-19",
  organizationId: "organization-1",
  returnUrl: "https://eu.usejori.com/settings?tab=billing",
}

beforeEach(() => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("JORI_APP_URL", "https://eu.usejori.com")
  for (const name of polarEnvironmentNames) {
    vi.stubEnv(name, "configured-test-value")
  }
  vi.stubEnv("POLAR_PRODUCT_CLOUD", "product_cloud")
  vi.stubEnv("POLAR_PRODUCT_TOP_UP", "product_top_up")
  vi.clearAllMocks()
})
afterEach(() => vi.unstubAllEnvs())

test.each([startPlanCheckout, startTopUpCheckout, openPortal])(
  "rejects incomplete billing before creating any resources",
  async (action) => {
    vi.stubEnv("POLAR_WEBHOOK_SECRET", "")
    const { ctx, runMutation } = context()
    await expect(
      invoke(action, ctx, {
        ...common,
        amountUsd: 25,
      })
    ).rejects.toThrow("Billing is not available in this instance yet.")
    expect(runMutation).not.toHaveBeenCalled()
    expect(polarRequest).not.toHaveBeenCalled()
  }
)

test.each([startPlanCheckout, startTopUpCheckout, openPortal])(
  "rejects cross-region returns before creating any billing resources",
  async (action) => {
    const { ctx, runMutation } = context()
    await expect(
      invoke(action, ctx, {
        ...common,
        returnUrl: "https://us.usejori.com/settings",
        amountUsd: 25,
      })
    ).rejects.toThrow("Return URL must point to the Jori app.")
    expect(runMutation).not.toHaveBeenCalled()
    expect(polarRequest).not.toHaveBeenCalled()
  }
)

test("plan checkout sells the plan to the organization as a business in its region", async () => {
  await invoke(startPlanCheckout, context(false).ctx, { ...common })
  expect(polarRequest).toHaveBeenCalledWith("/v1/checkouts/", {
    method: "POST",
    body: expect.objectContaining({
      products: ["product_cloud"],
      external_customer_id: "organization-1",
      customer_email: "test@example.com",
      customer_metadata: { organizationId: "organization-1", region: "eu" },
      metadata: expect.objectContaining({ region: "eu", kind: "plan" }),
      is_business_customer: true,
      require_billing_address: true,
      success_url:
        "https://eu.usejori.com/settings?tab=billing&billing=subscribed",
      return_url:
        "https://eu.usejori.com/settings?tab=billing&billing=canceled",
    }),
  })
  expect(vi.mocked(polarRequest).mock.calls[0]?.[1]?.body).not.toHaveProperty(
    "prices"
  )
})

test("top-up checkout prices the chosen amount for that checkout only", async () => {
  await invoke(startTopUpCheckout, context().ctx, { ...common, amountUsd: 25 })
  expect(polarRequest).toHaveBeenCalledWith("/v1/checkouts/", {
    method: "POST",
    body: expect.objectContaining({
      products: ["product_top_up"],
      prices: {
        product_top_up: [
          {
            amount_type: "fixed",
            price_amount: 2500,
            price_currency: "usd",
            tax_behavior: "exclusive",
          },
        ],
      },
      metadata: expect.objectContaining({ region: "eu", kind: "top-up" }),
    }),
  })
})

test("portal stays on the current regional origin", async () => {
  await invoke(openPortal, context().ctx, common)
  expect(polarRequest).toHaveBeenCalledWith("/v1/customer-sessions/", {
    method: "POST",
    body: { customer_id: "customer_1", return_url: common.returnUrl },
  })
})

function invoke(
  action: unknown,
  ctx: ActionCtx,
  args: Record<string, unknown>
) {
  return (
    action as {
      _handler: (
        ctx: ActionCtx,
        args: Record<string, unknown>
      ) => Promise<unknown>
    }
  )._handler(ctx, args)
}

function context(hasCustomer = true) {
  const runMutation = vi.fn(async () => ({
    state: { kind: "active" },
    ...(hasCustomer ? { polar: { customerId: "customer_1" } } : {}),
  }))
  const ctx = {
    auth: {
      getUserIdentity: async () => ({
        org: "organization-1",
        email: "test@example.com",
      }),
    },
    runMutation,
    runQuery: vi.fn(async (reference) => {
      if (getFunctionName(reference) !== "retention/records:deleting") {
        throw new Error("Unexpected query in checkout fixture")
      }
      return false
    }),
  } as unknown as ActionCtx
  return { ctx, runMutation }
}

test.each([startPlanCheckout, startTopUpCheckout])(
  "requires current business terms before a purchase",
  async (action) => {
    const { ctx, runMutation } = context()
    await expect(
      invoke(action, ctx, {
        ...common,
        amountUsd: 25,
        businessPurchase: false,
      })
    ).rejects.toThrow("Confirm business use")
    await expect(
      invoke(action, ctx, {
        ...common,
        amountUsd: 25,
        termsVersion: "old",
      })
    ).rejects.toThrow("current terms")
    expect(runMutation).not.toHaveBeenCalled()
    expect(polarRequest).not.toHaveBeenCalled()
  }
)
