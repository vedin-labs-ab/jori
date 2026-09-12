import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { stripeRequest } from "./client"
import { stripeMetadata } from "./config"
import { readCheckoutSubscription } from "./fulfillment"

vi.mock("./client", () => ({
  stripeRequest: vi.fn(async () => ({ id: "sub_1" })),
}))

beforeEach(() => {
  vi.stubEnv("JORI_REGION", "eu")
  vi.clearAllMocks()
})
afterEach(() => vi.unstubAllEnvs())

test("metadata cannot override the deployment region", () => {
  expect(
    stripeMetadata({ region: "us", organizationId: "organization-1" })
  ).toEqual({ region: "eu", organizationId: "organization-1" })
})

test.each([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
])("reads current subscription for paid %s", async (type) => {
  await expect(readCheckoutSubscription(event(type))).resolves.toEqual({
    id: "sub_1",
  })
  expect(stripeRequest).toHaveBeenCalledWith("/v1/subscriptions/sub_1", {
    method: "GET",
  })
})

test.each([
  event("checkout.session.completed", { payment_status: "unpaid" }),
  event("checkout.session.async_payment_failed"),
  event("checkout.session.completed", {
    metadata: { region: "us", kind: "plan" },
  }),
  event("checkout.session.completed", {
    metadata: { region: "eu", kind: "top-up" },
  }),
])(
  "does not fetch unpaid, failed, foreign-region or top-up subscriptions",
  async (payload) => {
    await expect(readCheckoutSubscription(payload)).resolves.toBeUndefined()
    expect(stripeRequest).not.toHaveBeenCalled()
  }
)

test("subscription lookup failure propagates so Stripe retries delivery", async () => {
  vi.mocked(stripeRequest).mockRejectedValueOnce(new Error("Unavailable"))
  await expect(
    readCheckoutSubscription(event("checkout.session.completed"))
  ).rejects.toThrow("Unavailable")
})

function event(type: string, values: Record<string, unknown> = {}) {
  return {
    type,
    data: {
      object: {
        subscription: "sub_1",
        payment_status: "paid",
        metadata: { region: "eu", kind: "plan" },
        ...values,
      },
    },
  }
}
