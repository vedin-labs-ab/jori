import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { type ActionCtx } from "../../_generated/server"
import { polarEnvironmentNames } from "./config"
import { execute } from "./topup"

const handle = (
  execute as unknown as {
    _handler: (
      ctx: ActionCtx,
      args: { organizationId: string }
    ) => Promise<null>
  }
)._handler

beforeEach(() => {
  for (const name of polarEnvironmentNames) {
    vi.stubEnv(name, "configured-test-value")
  }
  vi.stubEnv("POLAR_SERVER", "sandbox")
  vi.stubEnv("JORI_REGION", "eu")
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function fixture(
  options: {
    preferred?: string
    methods?: unknown[]
    enabled?: boolean
    decline?: boolean
  } = {}
) {
  const runMutation = vi.fn()
  const ctx = {
    runMutation,
    runQuery: vi.fn(async () => ({
      state: { kind: "active" },
      polar: { customerId: "customer_1" },
      topUp: {
        charged: { micros: 0 },
        ...(options.enabled === false
          ? {}
          : {
              micros: {
                amount: 25_000_000,
                cap: 100_000_000,
                threshold: 5_000_000,
              },
            }),
      },
    })),
  } as unknown as ActionCtx
  const fetch = vi.fn(async (url: URL, init?: RequestInit) => {
    if (url.pathname === "/v1/customers/customer_1") {
      return Response.json({
        id: "customer_1",
        default_payment_method_id: options.preferred ?? null,
      })
    }
    if (url.pathname === "/v1/customers/customer_1/payment-methods") {
      return Response.json({
        items: options.methods ?? [{ id: "card_only", type: "card" }],
        pagination: { max_page: 1 },
      })
    }
    if (url.pathname === "/v1/orders/" && init?.method === "POST") {
      return Response.json({ id: "order_auto" })
    }
    if (
      url.pathname === "/v1/orders/order_auto/finalize" &&
      init?.method === "POST"
    ) {
      return options.decline
        ? new Response(null, { status: 402 })
        : Response.json({ id: "order_auto", paid: true })
    }
    throw new Error("Unexpected request")
  })
  vi.stubGlobal("fetch", fetch)
  return { ctx, runMutation, fetch }
}

test("auto top-up uses the sole saved card when no default is selected", async () => {
  const { ctx, fetch, runMutation } = fixture()
  await handle(ctx, { organizationId: "organization_1" })
  expect(fetch.mock.calls.map(([url]) => url.pathname)).toEqual([
    "/v1/customers/customer_1",
    "/v1/customers/customer_1/payment-methods",
    "/v1/orders/",
    "/v1/orders/order_auto/finalize",
  ])
  expect(JSON.parse(fetch.mock.calls[3]?.[1]?.body as string)).toEqual({
    payment_method_id: "card_only",
  })
  expect(runMutation).not.toHaveBeenCalled()
})

test("an explicit default takes precedence without inspecting other saved cards", async () => {
  const { ctx, fetch } = fixture({ preferred: "card_preferred" })
  await handle(ctx, { organizationId: "organization_1" })
  expect(fetch).toHaveBeenCalledTimes(3)
  expect(JSON.parse(fetch.mock.calls[2]?.[1]?.body as string)).toEqual({
    payment_method_id: "card_preferred",
  })
})

test.each([
  { methods: [] },
  {
    methods: [
      { id: "first", type: "card" },
      { id: "second", type: "card" },
    ],
  },
  { methods: [{ id: "bank", type: "bank_account" }] },
])(
  "missing or ambiguous saved cards never create an order: %j",
  async ({ methods }) => {
    const { ctx, fetch, runMutation } = fixture({ methods })
    await handle(ctx, { organizationId: "organization_1" })
    expect(fetch.mock.calls.every(([, init]) => init?.method === "GET")).toBe(
      true
    )
    expect(runMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: "organization_1",
        cooldownMs: expect.any(Number),
      })
    )
  }
)

test("disabled auto top-up never inspects or charges a saved card", async () => {
  const { ctx, fetch, runMutation } = fixture({ enabled: false })
  await handle(ctx, { organizationId: "organization_1" })
  expect(fetch).not.toHaveBeenCalled()
  expect(runMutation).not.toHaveBeenCalled()
})

test("a declined saved card starts cooldown without crediting the wallet", async () => {
  const { ctx, runMutation } = fixture({ decline: true })
  await handle(ctx, { organizationId: "organization_1" })
  expect(runMutation).toHaveBeenCalledTimes(1)
  expect(runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ cooldownMs: expect.any(Number) })
  )
})
