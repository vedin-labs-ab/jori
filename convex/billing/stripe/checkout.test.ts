import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type ActionCtx } from "../../_generated/server"
import { openPortal, startPlanCheckout, startTopUpCheckout } from "./checkout"
import { stripeRequest } from "./client"
import { stripeEnvironmentNames } from "./config"

vi.mock("./client", async (original) => ({
  ...(await original<typeof import("./client")>()),
  stripeRequest: vi.fn(async () => ({
    id: "cus_1",
    url: "https://stripe.test",
  })),
}))

const common = {
  businessPurchase: true,
  termsVersion: "2026-09-12",
  organizationId: "organization-1",
  returnUrl: "https://eu.usejori.com/settings?tab=billing",
}

beforeEach(() => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("JORI_APP_URL", "https://eu.usejori.com")
  for (const name of stripeEnvironmentNames) {
    vi.stubEnv(name, "configured-test-value")
  }
  vi.stubEnv("STRIPE_PRICE_STARTER_MONTH", "price_starter_month")
  vi.clearAllMocks()
})
afterEach(() => vi.unstubAllEnvs())

test.each([
  startPlanCheckout,
  startTopUpCheckout,
  openPortal,
])("rejects incomplete billing before creating any resources", async (action) => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "")
  const { ctx, runMutation } = context()
  await expect(
    invoke(action, ctx, {
      ...common,
      plan: "starter",
      interval: "month",
      amountUsd: 25,
    })
  ).rejects.toThrow("Billing is not available in this instance yet.")
  expect(runMutation).not.toHaveBeenCalled()
  expect(stripeRequest).not.toHaveBeenCalled()
})

test.each([
  startPlanCheckout,
  startTopUpCheckout,
  openPortal,
])("rejects cross-region returns before creating any billing resources", async (action) => {
  const { ctx, runMutation } = context()
  await expect(
    invoke(action, ctx, {
      ...common,
      returnUrl: "https://us.usejori.com/settings",
      plan: "starter",
      interval: "month",
      amountUsd: 25,
    })
  ).rejects.toThrow("Return URL must point to the Jori app.")
  expect(runMutation).not.toHaveBeenCalled()
  expect(stripeRequest).not.toHaveBeenCalled()
})

test("subscription checkout uses regional metadata and dynamic methods", async () => {
  await invoke(startPlanCheckout, context().ctx, {
    ...common,
    plan: "starter",
    interval: "month",
  })
  expect(stripeRequest).toHaveBeenCalledWith("/v1/checkout/sessions", {
    params: expect.objectContaining({
      metadata: expect.objectContaining({ region: "eu" }),
      subscription_data: {
        metadata: { organizationId: "organization-1", region: "eu" },
      },
      success_url:
        "https://eu.usejori.com/settings?tab=billing&billing=subscribed",
      cancel_url:
        "https://eu.usejori.com/settings?tab=billing&billing=canceled",
    }),
  })
  expect(
    vi.mocked(stripeRequest).mock.calls[0]?.[1]?.params
  ).not.toHaveProperty("payment_method_types")
})

test("top-up checkout tags both session and payment intent", async () => {
  await invoke(startTopUpCheckout, context().ctx, { ...common, amountUsd: 25 })
  expect(stripeRequest).toHaveBeenCalledWith("/v1/checkout/sessions", {
    params: expect.objectContaining({
      metadata: expect.objectContaining({ region: "eu", kind: "top-up" }),
      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: { organizationId: "organization-1", region: "eu" },
      },
    }),
  })
  expect(
    vi.mocked(stripeRequest).mock.calls[0]?.[1]?.params
  ).not.toHaveProperty("payment_method_types")
})

test("new Stripe customers carry the deployment region", async () => {
  await invoke(startPlanCheckout, context(false).ctx, {
    ...common,
    plan: "starter",
    interval: "month",
  })
  expect(stripeRequest).toHaveBeenCalledWith("/v1/customers", {
    params: {
      email: "test@example.com",
      metadata: { organizationId: "organization-1", region: "eu" },
    },
  })
})

test("portal stays on the current regional origin", async () => {
  await invoke(openPortal, context().ctx, common)
  expect(stripeRequest).toHaveBeenCalledWith("/v1/billing_portal/sessions", {
    params: { customer: "cus_1", return_url: common.returnUrl },
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
    state: { kind: "active", plan: "starter", interval: "month" },
    ...(hasCustomer ? { stripe: { customerId: "cus_1" } } : {}),
  }))
  const ctx = {
    auth: {
      getUserIdentity: async () => ({
        org: "organization-1",
        email: "test@example.com",
      }),
    },
    runMutation,
  } as unknown as ActionCtx
  return { ctx, runMutation }
}

test.each([
  startPlanCheckout,
  startTopUpCheckout,
])("requires current business terms before a purchase", async (action) => {
  const { ctx, runMutation } = context()
  await expect(
    invoke(action, ctx, {
      ...common,
      plan: "starter",
      interval: "month",
      amountUsd: 25,
      businessPurchase: false,
    })
  ).rejects.toThrow("Confirm business use")
  await expect(
    invoke(action, ctx, {
      ...common,
      plan: "starter",
      interval: "month",
      amountUsd: 25,
      termsVersion: "old",
    })
  ).rejects.toThrow("current terms")
  expect(runMutation).not.toHaveBeenCalled()
  expect(stripeRequest).not.toHaveBeenCalled()
})
