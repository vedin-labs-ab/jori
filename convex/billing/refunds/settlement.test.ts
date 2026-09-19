// @vitest-environment edge-runtime
import { afterEach, expect, test, vi } from "vitest"
import { args, freezeSettled, setup } from "../../../test/billing/accounts"
import { internal } from "../../_generated/api"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

test("requires the action drain window and keeps its original start on repeated freeze", async () => {
  const { t, id } = await setup()
  const freezeArgs = {
    organizationId: args.organizationId,
    caseId: args.caseId,
  }
  await t.mutation(internal.billing.refunds.data.freeze, freezeArgs)
  const heldAt = (await t.run(async (ctx) => await ctx.db.get(id)))
    ?.refundHeldAt
  await t.mutation(internal.billing.refunds.data.freeze, freezeArgs)
  expect((await t.run(async (ctx) => await ctx.db.get(id)))?.refundHeldAt).toBe(
    heldAt
  )
  await expect(
    t.action(internal.billing.refunds.actions.prepare, args)
  ).rejects.toThrow("35 minutes")
  expect(
    (await t.run(async (ctx) => await ctx.db.get(id)))?.micros.allowance
  ).toBe(10_000_000)
})

test("stopped runs with live workflows still block refund reservation", async () => {
  const { t } = await setup()
  await freezeSettled(t)
  const runId = await t.run(
    async (ctx) =>
      await ctx.db.insert("runs", {
        organizationId: args.organizationId,
        audience: "organization",
        cause: { type: "manual" },
        principal: { kind: "organization" },
        snapshot: {
          context: [],
          source: { type: "manual" },
          title: "Stopped run",
        },
        status: "stopped",
        workflowId: "draining-workflow",
        createdAt: 0,
      })
  )
  await expect(
    t.action(internal.billing.refunds.actions.prepare, args)
  ).rejects.toThrow("including stopped runs")
  await t.run(
    async (ctx) => await ctx.db.patch(runId, { workflowId: undefined })
  )
  await expect(
    t.action(internal.billing.refunds.actions.prepare, args)
  ).resolves.toBeTypeOf("string")
})

test("wallet refund waits until the exact original order is credited", async () => {
  const { t } = await setup()
  await freezeSettled(t)
  await t.run(async (ctx) => {
    const receipt = await ctx.db
      .query("transactions")
      .withIndex("by_orderId_and_type", (q) =>
        q.eq("orderId", "order_original").eq("type", "topup")
      )
      .unique()
    if (receipt !== null) {
      await ctx.db.delete(receipt._id)
    }
  })
  await expect(
    t.action(internal.billing.refunds.actions.prepare, {
      ...args,
      allowanceMicros: 0,
      walletMicros: 10_000_000,
    })
  ).rejects.toThrow("top-up credited to this workspace")
})
