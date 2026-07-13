import { expect, test, vi } from "vitest"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { scheduleTransitionSurfaceSync } from "./surface"

test("schedules approval surface synchronization", async () => {
  const { ctx, runAfter } = fixture()
  const approvalId = "approval" as Id<"approvals">

  await scheduleTransitionSurfaceSync(ctx, {
    kind: "approval",
    id: approvalId,
  })

  expect(runAfter).toHaveBeenCalledWith(
    0,
    internal.integrations.slack.approvals.surface.sync,
    { approvalId }
  )
})

test("schedules integration offer surface synchronization", async () => {
  const { ctx, runAfter } = fixture()
  const integrationOfferId = "offer" as Id<"integrationOffers">

  await scheduleTransitionSurfaceSync(ctx, {
    kind: "integrationOffer",
    id: integrationOfferId,
  })

  expect(runAfter).toHaveBeenCalledWith(
    0,
    internal.integrations.slack.offers.surface.sync,
    { integrationOfferId }
  )
})

function fixture() {
  const runAfter = vi.fn(async () => undefined)
  const ctx = {
    scheduler: { runAfter },
  } as unknown as MutationCtx

  return { ctx, runAfter }
}
