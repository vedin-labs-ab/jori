// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import schema from "../schema"
import { grant } from "./allowance"
import { grantAllowance } from "./ledger"

const modules = import.meta.glob("/convex/{_generated,billing}/**/*.{ts,js}")
const reference = makeFunctionReference<
  "mutation",
  {
    organizationId: string
    micros: number
    idempotencyKey: string
    reason: string
    operator: string
  },
  { transactionId: string; applied: boolean }
>("billing/allowance:grant")
const args = {
  organizationId: "verification-eu",
  micros: 25_000_000,
  idempotencyKey: "verification-20260908-eu",
  reason: "Owner-approved synthetic tool verification allowance",
  operator: "Authorized verification operator",
}
type Account = Omit<Doc<"accounts">, "_id" | "_creationTime">
const account: Account = {
  organizationId: args.organizationId,
  state: { kind: "trial", endsAt: Date.now() + 100_000 },
  micros: { allowance: 0, wallet: -2_150_380 },
  renewsAt: 123,
  topUp: {
    micros: { threshold: 10, amount: 20, cap: 100 },
    charged: { micros: 50, releaseAt: 999 },
  },
  stripe: {
    customerId: "fixture-customer",
    subscriptionId: "fixture-subscription",
  },
  updatedAt: 1,
}

async function setup(overrides: Partial<Account> = {}) {
  const t = convexTest(schema, modules)
  const id = await t.run(
    async (ctx) => await ctx.db.insert("accounts", { ...account, ...overrides })
  )
  return { t, id }
}

test("grant is internal only", () => {
  expect(grant.isInternal).toBe(true)
})

test("grant adds allowance and an honest audit receipt without changing account settings", async () => {
  const { t, id } = await setup()
  const before = await t.run(async (ctx) => await ctx.db.get(id))
  const result = await t.mutation(reference, args)
  const after = await t.run(async (ctx) => await ctx.db.get(id))
  expect(result.applied).toBe(true)
  expect(after).toEqual({
    ...before,
    micros: { allowance: 25_000_000, wallet: -2_150_380 },
    updatedAt: expect.any(Number),
  })
  const entries = await t.run(
    async (ctx) => await ctx.db.query("transactions").take(10)
  )
  expect(entries).toEqual([
    expect.objectContaining({
      _id: result.transactionId,
      organizationId: args.organizationId,
      type: "allowance",
      source: "manual",
      micros: { amount: 25_000_000, balance: 22_849_620 },
      reason: args.reason,
      operator: args.operator,
      idempotencyKey: args.idempotencyKey,
    }),
  ])
  expect(entries[0]).not.toHaveProperty("stripeId")
})

test("a replay returns the original receipt without granting again", async () => {
  const { t, id } = await setup()
  const first = await t.mutation(reference, args)
  const before = await t.run(async (ctx) => await ctx.db.get(id))
  expect(await t.mutation(reference, args)).toEqual({
    ...first,
    applied: false,
  })
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toEqual(before)
  expect(
    await t.run(async (ctx) => await ctx.db.query("transactions").take(10))
  ).toHaveLength(1)
})

test.each([
  { micros: 1 },
  { reason: "Different reason" },
  { operator: "Different operator" },
  { organizationId: "verification-us" },
])("rejects reused keys with conflicting arguments: %j", async (change) => {
  const { t, id } = await setup()
  await t.mutation(reference, args)
  const before = await t.run(async (ctx) => await ctx.db.get(id))
  await expect(t.mutation(reference, { ...args, ...change })).rejects.toThrow(
    "different grant"
  )
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toEqual(before)
  expect(
    await t.run(async (ctx) => await ctx.db.query("transactions").take(10))
  ).toHaveLength(1)
})

test.each([0, -1, 1.5, NaN, Infinity, 1_000_000_001])(
  "rejects invalid amount %s without writes",
  async (micros) => {
    const { t, id } = await setup()
    const before = await t.run(async (ctx) => await ctx.db.get(id))
    await expect(t.mutation(reference, { ...args, micros })).rejects.toThrow()
    expect(await t.run(async (ctx) => await ctx.db.get(id))).toEqual(before)
    expect(
      await t.run(async (ctx) => await ctx.db.query("transactions").take(10))
    ).toEqual([])
  }
)

test.each([1, 1_000_000_000])(
  "accepts bounded integer amount %s",
  async (micros) => {
    const { t } = await setup()
    expect((await t.mutation(reference, { ...args, micros })).applied).toBe(
      true
    )
  }
)

test.each([
  { reason: "" },
  { reason: " leading" },
  { reason: "x".repeat(1001) },
  { operator: " " },
  { operator: "x".repeat(201) },
  { idempotencyKey: "" },
  { idempotencyKey: "x".repeat(201) },
])("requires bounded audit fields: %j", async (change) => {
  const { t } = await setup()
  await expect(t.mutation(reference, { ...args, ...change })).rejects.toThrow()
  expect(
    await t.run(async (ctx) => await ctx.db.query("transactions").take(10))
  ).toEqual([])
})

test("does not create billing accounts for unknown organizations", async () => {
  const t = convexTest(schema, modules)
  await expect(t.mutation(reference, args)).rejects.toThrow(
    "existing billing account"
  )
  expect(
    await t.run(async (ctx) => await ctx.db.query("accounts").take(10))
  ).toEqual([])
})

test("rejects unsafe resulting balances", async () => {
  const { t } = await setup({
    micros: { allowance: Number.MAX_SAFE_INTEGER, wallet: 0 },
  })
  await expect(t.mutation(reference, args)).rejects.toThrow("safe integer")
})

test("an aborted transaction rolls back the balance and audit entry together", async () => {
  const { t, id } = await setup()
  const before = await t.run(async (ctx) => await ctx.db.get(id))
  await expect(
    t.run(async (ctx) => {
      await grantAllowance(ctx, args)
      throw new Error("Abort transaction")
    })
  ).rejects.toThrow("Abort transaction")
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toEqual(before)
  expect(
    await t.run(async (ctx) => await ctx.db.query("transactions").take(10))
  ).toEqual([])
})
