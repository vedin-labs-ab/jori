import { getFunctionName } from "convex/server"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { storage } from "../../../contracts/billing"
import { type ActionCtx } from "../../_generated/server"
import { polarRequest } from "../polar/client"
import { polarEnvironmentNames } from "../polar/config"
import { change, checkout } from "./actions"

vi.mock("../polar/client", async (original) => ({
  ...(await original<typeof import("../polar/client")>()),
  polarRequest: vi.fn(),
  polarList: vi.fn(async () => []),
}))
const common = {
  organizationId: "organization-1",
  businessPurchase: true,
  termsVersion: "2026-09-19",
  extraGb: 40,
  returnUrl: "https://eu.usejori.com/settings?tab=billing",
}
function subscription(extra: Record<string, unknown> = {}) {
  return {
    id: "storage_subscription",
    customer_id: "customer",
    product_id: "storage_product",
    status: "active",
    units: 40,
    currency: "usd",
    recurring_interval: "month",
    recurring_interval_count: 1,
    metadata: { organizationId: common.organizationId, region: "eu" },
    ...extra,
  }
}
beforeEach(() => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.stubEnv("JORI_APP_URL", "https://eu.usejori.com")
  for (const name of polarEnvironmentNames) {
    vi.stubEnv(name, "test-configured")
  }
  vi.stubEnv("POLAR_PRODUCT_STORAGE", "storage_product")
  vi.mocked(polarRequest).mockReset()
  vi.mocked(polarRequest).mockImplementation(async (path, args) =>
    path === "/v1/checkouts/"
      ? {
          id: "checkout",
          status: "open",
          customer_id: "customer",
          product_id: "storage_product",
          units: args?.body?.units,
          metadata: args?.body?.metadata,
          url: "https://polar.test/checkout",
        }
      : subscription(args?.body ?? {})
  )
})
afterEach(() => vi.unstubAllEnvs())

function context(storage = false, overrides: Record<string, unknown> = {}) {
  const account = {
    organizationId: common.organizationId,
    state: { kind: "active" },
    polar: { customerId: "customer" },
    ...(storage
      ? { storage: { subscriptionId: "storage_subscription", extraGb: 40 } }
      : {}),
    ...overrides,
  }
  return {
    auth: {
      getUserIdentity: async () => ({
        org: common.organizationId,
        email: "test@example.com",
      }),
    },
    runMutation: vi.fn(async (ref, args) => {
      const name = getFunctionName(ref)
      if (name.endsWith("reservation:reserve")) {
        return {
          attempt: args.attempt,
          productId: args.productId,
          started: false,
        }
      }
      if (name.endsWith("reservation:start")) {
        return true
      }
      return name === "billing/polar/data:ensure" ? account : null
    }),
    runQuery: vi.fn(async () => false),
  } as unknown as ActionCtx
}
function invoke(action: unknown, ctx: ActionCtx, args = common) {
  return (
    action as {
      _handler: (ctx: ActionCtx, args: typeof common) => Promise<unknown>
    }
  )._handler(ctx, args)
}

test("storage checkout sells monthly units to the same regional customer without overriding prices", async () => {
  await invoke(checkout, context())
  expect(polarRequest).toHaveBeenCalledWith("/v1/checkouts/", {
    method: "POST",
    body: expect.objectContaining({
      products: ["storage_product"],
      units: 40,
      customer_id: "customer",
      metadata: expect.objectContaining({ kind: "storage", region: "eu" }),
      allow_discount_codes: false,
      success_url:
        "https://eu.usejori.com/settings?tab=billing&billing=storage",
    }),
  })
  expect(vi.mocked(polarRequest).mock.calls[0]?.[1]?.body).not.toHaveProperty(
    "prices"
  )
})

test.each([
  storage.minimumExtraGb - 1,
  4.5,
  -4,
  storage.maximumExtraGb + 1,
  Number.NaN,
  Number.POSITIVE_INFINITY,
])("invalid capacity %s never creates a checkout", async (extraGb) => {
  await expect(
    invoke(checkout, context(), { ...common, extraGb })
  ).rejects.toThrow("extra GB")
  expect(polarRequest).not.toHaveBeenCalled()
})

test("missing storage configuration does not disable the base plan or initiate a purchase", async () => {
  vi.stubEnv("POLAR_PRODUCT_STORAGE", "")
  await expect(invoke(checkout, context())).rejects.toThrow(
    "POLAR_PRODUCT_STORAGE"
  )
  expect(polarRequest).not.toHaveBeenCalled()
})

test.each([
  [
    { state: { kind: "paused" } },
    "An active plan is required to fund the wallet.",
  ],
  [
    { state: { kind: "unsubscribed" } },
    "An active plan is required to fund the wallet.",
  ],
  [
    { refundHold: "support-case" },
    "Billing is paused while support settles a refund.",
  ],
  [
    { storage: { subscriptionId: "existing", extraGb: 4 } },
    "This workspace already has extra storage.",
  ],
] as const)(
  "ineligible accounts cannot buy duplicate or unavailable storage: %j",
  async (overrides, message) => {
    await expect(invoke(checkout, context(false, overrides))).rejects.toThrow(
      message
    )
    expect(polarRequest).not.toHaveBeenCalled()
  }
)

test("cross-region return URLs are rejected before creating provider resources", async () => {
  await expect(
    invoke(checkout, context(), {
      ...common,
      returnUrl: "https://us.usejori.com/settings",
    })
  ).rejects.toThrow("Return URL")
  expect(polarRequest).not.toHaveBeenCalled()
})

test.each([
  { extraGb: 80, body: { units: 80, proration_behavior: "invoice" } },
  { extraGb: 4, body: { units: 4, proration_behavior: "next_period" } },
  { extraGb: 0, body: { cancel_at_period_end: true } },
])(
  "capacity change %s uses the correct paid or deferred provider operation",
  async ({ extraGb, body }) => {
    const ctx = context(true)
    await invoke(change, ctx, { ...common, extraGb })
    expect(polarRequest).toHaveBeenCalledWith(
      "/v1/subscriptions/storage_subscription",
      { method: "PATCH", body }
    )
    expect(ctx.runMutation).toHaveBeenCalledTimes(2)
  }
)

test("a declined upgrade never changes local capacity", async () => {
  vi.mocked(polarRequest)
    .mockResolvedValueOnce(subscription())
    .mockRejectedValueOnce(new Error("Payment declined"))
  const ctx = context(true)
  await expect(invoke(change, ctx, { ...common, extraGb: 80 })).rejects.toThrow(
    "Payment declined"
  )
  expect(ctx.runMutation).toHaveBeenCalledTimes(1)
})

test.each([
  { customer_id: "other" },
  { metadata: { organizationId: "other", region: "eu" } },
  { product_id: "product_cloud" },
  { units: 0 },
  { status: "past_due" },
])(
  "changes fail closed when live provider subscription is not eligible: %j",
  async (extra) => {
    vi.mocked(polarRequest).mockResolvedValueOnce(subscription(extra))
    await expect(invoke(change, context(true))).rejects.toThrow()
    expect(polarRequest).toHaveBeenCalledTimes(1)
  }
)

test("a scheduled cancellation is never undone by a failed capacity change", async () => {
  vi.mocked(polarRequest).mockResolvedValueOnce(
    subscription({ cancel_at_period_end: true })
  )
  await expect(
    invoke(change, context(true), { ...common, extraGb: 80 })
  ).rejects.toThrow("Resume extra storage")
  expect(polarRequest).toHaveBeenCalledTimes(1)
})

test("failed renewal still permits canceling extra storage", async () => {
  vi.mocked(polarRequest).mockResolvedValueOnce(
    subscription({ status: "past_due" })
  )
  await invoke(change, context(true), { ...common, extraGb: 0 })
  expect(polarRequest).toHaveBeenCalledWith(
    "/v1/subscriptions/storage_subscription",
    { method: "PATCH", body: { cancel_at_period_end: true } }
  )
})
