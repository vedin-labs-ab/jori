// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "../../_generated/api"
import schema from "../../schema"

const modules = import.meta.glob("/convex/{_generated,billing}/**/*.{ts,js}")
const usage = {
  provider: "vertex",
  requestId: "request-1",
  model: "google/gemini-3.1-flash-image",
  micros: 73930,
  tokens: { input: 17, output: 1120 },
}

test("deduplicates provider receipts and meters the existing run ledger and usage rollup", async () => {
  const { t, runId } = await setup()
  await t.mutation(internal.billing.usage.records.record, { ...usage, runId })
  await t.mutation(internal.billing.usage.records.record, { ...usage, runId })
  const rows = await t.run(async (ctx) => ({
    receipts: await ctx.db.query("usageReceipts").collect(),
    transactions: await ctx.db.query("transactions").collect(),
    usage: await ctx.db.query("usage").collect(),
  }))
  expect(rows.receipts).toHaveLength(1)
  expect(rows.receipts[0]).toMatchObject({ ...usage, organizationId: "org" })
  expect(rows.transactions.filter((row) => row.type === "debit")).toEqual([
    expect.objectContaining({
      micros: expect.objectContaining({ amount: usage.micros }),
      tokens: usage.tokens,
    }),
  ])
  expect(rows.usage).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ model: usage.model, micros: usage.micros }),
    ])
  )
})

test("does not discard already incurred usage when a run stops", async () => {
  const { t, runId } = await setup()
  await t.run(async (ctx) => await ctx.db.patch(runId, { status: "stopped" }))
  await t.mutation(internal.billing.usage.records.record, { ...usage, runId })
  expect(
    await t.run(async (ctx) => await ctx.db.query("usageReceipts").collect())
  ).toHaveLength(1)
})

test("rejects conflicting receipt replays without modifying the first charge", async () => {
  const { t, runId } = await setup()
  await t.mutation(internal.billing.usage.records.record, { ...usage, runId })
  await expect(
    t.mutation(internal.billing.usage.records.record, {
      ...usage,
      runId,
      micros: 1,
    })
  ).rejects.toThrow("conflicts")
})

test.each([-1, Number.NaN, 0.5])(
  "rejects invalid amounts: %s",
  async (micros) => {
    const { t, runId } = await setup()
    await expect(
      t.mutation(internal.billing.usage.records.record, {
        ...usage,
        runId,
        micros,
      })
    ).rejects.toThrow("non-negative integers")
    expect(
      await t.run(async (ctx) => await ctx.db.query("usageReceipts").collect())
    ).toHaveLength(0)
  }
)

async function setup() {
  const t = convexTest(schema, modules)
  const runId = await t.run(
    async (ctx) =>
      await ctx.db.insert("runs", {
        organizationId: "org",
        audience: "organization",
        cause: { type: "manual" },
        principal: { kind: "organization" },
        snapshot: { context: [], source: { type: "manual" }, title: "Run" },
        status: "running",
        createdAt: 0,
      })
  )
  return { t, runId }
}
