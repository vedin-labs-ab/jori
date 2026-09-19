import { expect, vi } from "vitest"

const order = {
  id: "order_original",
  customer_id: "customer_org",
  status: "paid",
  paid: true,
  net_amount: 3000,
  refunded_amount: 0,
  currency: "usd",
}
export const refund = {
  id: "refund_verified",
  created_at: new Date().toISOString(),
  order_id: "order_original",
  amount: 2500,
  currency: "usd",
  status: "succeeded",
}

export function mockPolar(
  options: {
    refunded?: number
    refund?: Record<string, unknown>
    subscriptions?: unknown[]
    refunds?: unknown[]
    customer?: string
  } = {}
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL, init?: RequestInit) => {
      expect(init?.method).toBe("GET")
      const list = (items: unknown[]) => ({
        items,
        pagination: { total_count: items.length, max_page: 1 },
      })
      const responses: Record<string, unknown> = {
        "/v1/orders/order_original": {
          ...order,
          refunded_amount: options.refunded ?? 0,
          customer_id: options.customer ?? order.customer_id,
        },
        "/v1/subscriptions/": list(options.subscriptions ?? []),
        "/v1/orders/": list([]),
        "/v1/checkouts/": list([]),
        "/v1/refunds/": list(
          input.searchParams.has("id")
            ? [
                options.refund ?? {
                  ...refund,
                  created_at: new Date().toISOString(),
                },
              ]
            : (options.refunds ?? [])
        ),
      }
      const body = responses[input.pathname]
      if (body === undefined) {
        throw new Error(`Unexpected URL ${input}`)
      }
      return Response.json(body)
    })
  )
}
