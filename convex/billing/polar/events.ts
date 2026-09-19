import { v } from "convex/values"
import { plan } from "../../../contracts/billing"
import { type Doc } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { isWorkspaceDeleting } from "../../retention/access"
import { resumeWorkspace, retainWorkspace } from "../../retention/data"
import { readRecord, readString } from "../../shared/input"
import { getAccount } from "../account"
import { addMonths } from "../cycle"
import { resetAllowance } from "../ledger"
import { belongsToRegion, sellsPlan } from "./config"
import { applyPaidOrder } from "./fulfillment"

/**
 * The single place Polar state enters Jori. Each object is applied in one
 * transaction; money credits are idempotent on the order id and plan state
 * follows the subscription's current status, so webhook retries are
 * harmless, and malformed objects fall through as no-ops.
 */
export const apply = internalMutation({
  args: { order: v.optional(v.any()), subscription: v.optional(v.any()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = readRecord(args.order)
    const subscription = readRecord(args.subscription)

    if (args.order !== undefined && belongsToRegion(order)) {
      await applyPaidOrder(ctx, order)
    } else if (
      args.subscription !== undefined &&
      belongsToRegion(subscription)
    ) {
      await applySubscription(ctx, subscription)
    }

    return null
  },
})

/**
 * Portal cancellations, payment recovery, and revocations all arrive here.
 * `past_due` stays active: Polar keeps retrying the card, prepaid usage
 * bounds the exposure, and pausing on a flaky card would be hostile.
 */
async function applySubscription(
  ctx: MutationCtx,
  subscription: Record<string, unknown>
) {
  const organizationId = readString(
    readRecord(subscription.metadata),
    "organizationId"
  )
  const account =
    organizationId === undefined ? null : await getAccount(ctx, organizationId)
  // Only a paid order may attach the first subscription to an account.
  if (
    account?.polar === undefined ||
    account.polar.subscriptionId !== readString(subscription, "id") ||
    !isPlanSubscription(account, subscription)
  ) {
    return
  }

  const now = Date.now()
  const status = readString(subscription, "status")

  if (
    status === "canceled" ||
    status === "unpaid" ||
    status === "paused" ||
    status === "incomplete_expired"
  ) {
    const endedAt = subscriptionEnd(subscription, now)
    await retainWorkspace(ctx, account.organizationId, endedAt)
    await ctx.db.patch(account._id, {
      state: { kind: "paused" },
      renewsAt: undefined,
      // The customer outlives the subscription: the saved card and the
      // invoice history stay reachable after a cancellation.
      polar: { customerId: account.polar.customerId },
      updatedAt: now,
    })

    return
  }

  if (!(await canApplyActiveSubscription(ctx, account, status))) {
    return
  }

  await resumeWorkspace(ctx, account.organizationId)
  const resumed = account.state.kind !== "active" && status === "active"

  await ctx.db.patch(account._id, {
    state: { kind: "active" },
    ...(resumed && account.renewsAt === undefined
      ? { renewsAt: addMonths(now, 1) }
      : {}),
    updatedAt: now,
  })

  if (resumed) {
    await resetAllowance(ctx, {
      account,
      micros: plan.monthlyAllowanceMicros,
      source: "plan",
      now,
    })
  }
}

/** Whether a subscription change is about the plan: what Polar now sells,
 *  falling back to the account already being on it. An unsubscribed account
 *  has neither, so there is nothing to pause or resume. */
function isPlanSubscription(
  account: Doc<"accounts">,
  subscription: Record<string, unknown>
) {
  return (
    sellsPlan(subscription.product_id) || account.state.kind !== "unsubscribed"
  )
}

async function canApplyActiveSubscription(
  ctx: MutationCtx,
  account: Doc<"accounts">,
  status: string | undefined
) {
  return (
    (status === "active" || status === "past_due") &&
    account.refundHold === undefined &&
    !(await isWorkspaceDeleting(ctx, account.organizationId))
  )
}

function subscriptionEnd(subscription: Record<string, unknown>, now: number) {
  const endedAt = Date.parse(readString(subscription, "ended_at") ?? "")

  return Number.isNaN(endedAt) ? now : Math.min(now, endedAt)
}
