import { expect, vi } from "vitest"

const charge = {
  id: "ch_original",
  payment_intent: "pi_original",
  customer: "cus_org",
  status: "succeeded",
  paid: true,
  disputed: false,
  amount: 3000,
  amount_refunded: 0,
  currency: "usd",
}
export const refund = {
  id: "re_verified",
  created: Math.floor(Date.now() / 1000),
  charge: "ch_original",
  amount: 2500,
  currency: "usd",
  status: "succeeded",
}

export function mockStripe(
  options: {
    refunded?: number
    refund?: Record<string, unknown>
    subscriptions?: unknown[]
    refunds?: unknown[]
    customer?: string
    checkoutSessions?: unknown[]
  } = {}
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      expect(init?.method).toBe("GET")
      const path = new URL(input).pathname
      const responses: Record<string, unknown> = {
        "/v1/charges/ch_original": {
          ...charge,
          amount_refunded: options.refunded ?? 0,
          customer: options.customer ?? charge.customer,
        },
        "/v1/subscriptions": {
          data: options.subscriptions ?? [],
          has_more: false,
        },
        "/v1/payment_intents": { data: [], has_more: false },
        "/v1/checkout/sessions": {
          data: new URL(input).searchParams.has("payment_intent")
            ? (options.checkoutSessions ?? [])
            : [],
          has_more: false,
        },
        "/v1/refunds": { data: options.refunds ?? [], has_more: false },
        "/v1/refunds/re_verified": options.refund ?? {
          ...refund,
          created: Math.floor(Date.now() / 1000),
        },
      }
      const body = responses[path]
      if (body === undefined) {
        throw new Error(`Unexpected URL ${input}`)
      }
      return new Response(JSON.stringify(body), { status: 200 })
    })
  )
}
