import { type Infer, v } from "convex/values"
import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { getAccount } from "../account"
import { reservation } from "./schema"

export type Reservation = Infer<ReturnType<typeof requestValidator>>
function requestValidator() {
  return v.object(reservation)
}

export function validateReservation(args: Reservation) {
  for (const value of [
    args.amountMinor,
    args.allowanceMicros,
    args.walletMicros,
  ]) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error("Amounts must be nonnegative safe integers.")
    }
  }
  if (args.amountMinor === 0) {
    throw new Error("A refund amount must be positive.")
  }
  if (!/^[a-z]{3}$/.test(args.currency)) {
    throw new Error("Use a lowercase ISO currency.")
  }
  for (const key of ["caseId", "orderId", "operator", "calculation"] as const) {
    const value = args[key]
    if (
      value.trim() !== value ||
      value.length === 0 ||
      value.length > (key === "calculation" ? 2000 : 200)
    ) {
      throw new Error(`Invalid ${key}.`)
    }
  }
}

export async function heldAccount(
  ctx: MutationCtx,
  organizationId: string,
  caseId: string
) {
  const account = await getAccount(ctx, organizationId)
  if (account === null || account.refundHold !== caseId) {
    throw new Error("Freeze this support case first.")
  }
  return account
}

export async function requireSettled(
  ctx: MutationCtx,
  account: Doc<"accounts">
) {
  if (
    account.state.kind === "active" ||
    account.polar?.subscriptionId !== undefined ||
    account.storage !== undefined
  ) {
    throw new Error(
      "Cancel the subscription in Polar and wait for its webhook first."
    )
  }
  if ((account.topUp.charged.releaseAt ?? 0) > Date.now()) {
    throw new Error("Wait for the outstanding auto top-up attempt to settle.")
  }
  if (
    account.refundHeldAt === undefined ||
    Date.now() - account.refundHeldAt < 35 * 60_000
  ) {
    throw new Error(
      "Wait at least 35 minutes after freezing for stopped actions and usage callbacks to drain."
    )
  }
  const workflow = await ctx.db
    .query("runs")
    .withIndex("by_organizationId_and_workflowId", (q) =>
      q.eq("organizationId", account.organizationId).gt("workflowId", undefined)
    )
    .first()
  if (workflow !== null) {
    throw new Error(
      "Wait for all workspace workflows to settle, including stopped runs."
    )
  }
  for (const status of ["queued", "running"] as const) {
    const run = await ctx.db
      .query("runs")
      .withIndex("by_organizationId_and_status", (q) =>
        q.eq("organizationId", account.organizationId).eq("status", status)
      )
      .first()
    if (run !== null) {
      throw new Error(
        "Stop or finish in-flight runs before reserving a refund."
      )
    }
  }
}
