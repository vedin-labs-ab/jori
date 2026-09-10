// @vitest-environment edge-runtime
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { approvalFixture } from "../../test/approvals"
import { api, internal } from "../_generated/api"
import { claimIntegrationOffer } from "../integrations/offers/records"
import { ensureAccountPerson } from "../persons/account"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

async function fixture() {
  const { t, args, personId: ownerId } = await approvalFixture()
  const seeded = await t.run(async (ctx) => {
    const personId = await ensureAccountPerson(ctx, {
      organizationId: "verification",
      userId: "collaborator",
      name: "Priya",
    })
    const conversationId = await ctx.db.insert("conversations", {
      organizationId: "verification",
      surface: "console",
      externalId: "controls",
      scope: "person",
      createdBy: ownerId,
      visibility: { mode: "private" },
    })
    await ctx.db.patch(args.runId, { conversationId, createdBy: ownerId })
    await ctx.db.patch(args.approvalId, { status: "pending" })

    return { conversationId, personId }
  })

  return {
    ...seeded,
    ...args,
    t,
    caller: t.withIdentity({ subject: "collaborator", org: "verification" }),
  }
}

test("only people with current chat access can stop its run", async () => {
  const { caller, conversationId, personId, runId, t } = await fixture()
  const args = { organizationId: "verification", runId }

  await expect(caller.mutation(api.runs.control.stop, args)).rejects.toThrow(
    "Run not found."
  )
  await t.run(async (ctx) => {
    await ctx.db.patch(conversationId, {
      visibility: { mode: "people", personIds: [personId] },
    })
  })
  await caller.mutation(api.runs.control.stop, args)
  expect(await t.run(async (ctx) => await ctx.db.get(runId))).toMatchObject({
    status: "stopped",
  })
})

test("approval decisions recheck access after the initial console lookup", async () => {
  const { approvalId, conversationId, personId, t } = await fixture()
  const target = {
    approvalId,
    organizationId: "verification",
    personId,
  }
  expect(
    await t.query(internal.approvals.console.getDecisionTarget, target)
  ).toBeNull()
  await t.run(async (ctx) => {
    await ctx.db.patch(conversationId, { visibility: { mode: "organization" } })
  })
  expect(
    await t.query(internal.approvals.console.getDecisionTarget, target)
  ).not.toBeNull()
  await t.run(async (ctx) => {
    await ctx.db.patch(conversationId, { visibility: { mode: "private" } })
  })
  const decision = {
    approvalId,
    decision: "approved" as const,
    decidedBy: { kind: "person" as const, personId, name: "Priya" },
  }
  expect(
    await t.mutation(internal.approvals.approvals.decide, decision)
  ).toEqual({ status: "missing" })
  expect(
    await t.run(async (ctx) => await ctx.db.get(approvalId))
  ).toMatchObject({ status: "pending" })
  await t.run(async (ctx) => {
    await ctx.db.patch(conversationId, { visibility: { mode: "organization" } })
  })
  expect(
    await t.mutation(internal.approvals.approvals.decide, decision)
  ).toMatchObject({
    status: "approved",
    approval: { decidedBy: decision.decidedBy },
  })
})

test("connection offers enforce chat access on both console and token claim paths", async () => {
  const { caller, conversationId, runId, t } = await fixture()
  const integrationOfferId = await t.run(async (ctx) => {
    return await ctx.db.insert("integrationOffers", {
      organizationId: "verification",
      integration: "slack",
      tokenHash: "test-offer",
      status: "pending",
      source: { surface: "jori", runId },
      runId,
      expiresAt: Date.now() + 60_000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
  const args = { integrationOfferId, organizationId: "verification", runId }

  expect(await caller.mutation(api.runs.console.offers.cancel, args)).toEqual({
    status: "missing",
  })
  await expect(
    caller.mutation(api.runs.console.offers.claim, {
      ...args,
      returnUrl: "/runs",
    })
  ).rejects.toThrow("Integration offer not found.")
  await expect(
    caller.run(async (ctx) => {
      const offer = await ctx.db.get(integrationOfferId)
      if (offer === null) {
        throw new Error("Fixture missing.")
      }
      return await claimIntegrationOffer(ctx, { offer, returnUrl: "/runs" })
    })
  ).rejects.toThrow("Integration offer not found.")
  await t.run(async (ctx) => {
    await ctx.db.patch(conversationId, { visibility: { mode: "organization" } })
  })
  expect(await caller.mutation(api.runs.console.offers.cancel, args)).toEqual({
    status: "cancelled",
  })
})
