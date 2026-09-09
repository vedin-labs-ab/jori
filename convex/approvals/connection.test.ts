// @vitest-environment edge-runtime
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { approvalFixture } from "../../test/approvals"
import { internal } from "../_generated/api"

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

test("an approval from a prior provider grant cannot wake the run after reconnect", async () => {
  const { t, args, personId } = await approvalFixture()
  const integrationId = await t.run(async (ctx) => {
    await ctx.db.patch(args.approvalId, { status: "pending" })
    return await ctx.db.insert("integrations", {
      organizationId: "verification",
      integration: "slack",
      scope: "organization",
      externalId: "TTEST",
      credentials: {},
      status: "active",
      createdBy: personId,
      connectionGeneration: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
  const result = await t.mutation(internal.approvals.approvals.decide, {
    approvalId: args.approvalId,
    decision: "approved",
    decidedBy: { kind: "person", personId },
    expectedConnection: { integrationId, generation: 1 },
  })
  expect(result).toEqual({ status: "missing" })
  expect(
    await t.run(async (ctx) => await ctx.db.get(args.approvalId))
  ).toMatchObject({ status: "pending" })
  expect(
    await t.run(async (ctx) => await ctx.db.query("transitions").collect())
  ).toHaveLength(0)
})
