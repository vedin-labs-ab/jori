import { plan } from "../../../contracts/billing"
import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { isWorkspaceDeleting } from "../../retention/access"
import { resumeWorkspace } from "../../retention/data"
import { readArray, readRecord, readString } from "../../shared/input"
import { addMonths } from "../cycle"
import { resetAllowance } from "../ledger"
import { queueCancellation } from "./cancellation"
import { stripeRequest } from "./client"
import { belongsToRegion, sellsPlan } from "./config"

export function isCheckoutSuccess(type: string | undefined) {
  return (
    type === "checkout.session.completed" ||
    type === "checkout.session.async_payment_succeeded"
  )
}

/** Fetch current subscription state so delayed or reordered checkout events
 * cannot restore a canceled subscription or apply an outdated plan. */
export async function readCheckoutSubscription(event: unknown) {
  const session = readRecord(readRecord(readRecord(event).data).object)
  const subscriptionId = readString(session, "subscription")
  if (
    !isCheckoutSuccess(readString(event, "type")) ||
    !belongsToRegion(session) ||
    session.payment_status !== "paid" ||
    readRecord(session.metadata).kind !== "plan" ||
    subscriptionId === undefined
  ) {
    return undefined
  }
  return await stripeRequest(
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "GET",
    }
  )
}

export async function applyPlanCheckout(
  ctx: MutationCtx,
  account: Doc<"accounts">,
  session: Record<string, unknown>,
  subscription: Record<string, unknown>
) {
  const subscriptionId = readString(subscription, "id")
  const customerId = readString(subscription, "customer")
  if (
    !isPaidPlanSubscription(account, session, subscription) ||
    subscriptionId === undefined ||
    customerId === undefined
  ) {
    return
  }
  if (
    account.refundHold !== undefined ||
    (await isWorkspaceDeleting(ctx, account.organizationId))
  ) {
    await queueCancellation(ctx, account, subscriptionId, String(session.id))
    await ctx.db.patch(account._id, {
      refundHold: account.refundHold ?? `late-payment:${String(session.id)}`,
      topUp: { charged: account.topUp.charged },
      updatedAt: Date.now(),
    })
    return
  }
  await resumeWorkspace(ctx, account.organizationId)
  const now = Date.now()
  await resetAllowance(ctx, {
    account,
    micros: plan.monthlyAllowanceMicros,
    source: "plan",
    now,
  })
  await ctx.db.patch(account._id, {
    state: { kind: "active" },
    topUp: { charged: { micros: 0 } },
    stripe: { customerId, subscriptionId },
    renewsAt: addMonths(now, 1),
    updatedAt: now,
  })
}

/** Whether the subscription a checkout completed is the plan, live, and
 *  new to this account. The price is checked against what Stripe holds now
 *  rather than the checkout's metadata, so a stale session cannot sell
 *  something else. */
function isPaidPlanSubscription(
  account: Doc<"accounts">,
  session: Record<string, unknown>,
  subscription: Record<string, unknown>
) {
  if (
    !belongsToRegion(subscription) ||
    subscription.id !== session.subscription ||
    subscription.customer !== account.stripe?.customerId ||
    readRecord(subscription.metadata).organizationId !==
      account.organizationId ||
    account.stripe?.subscriptionId === subscription.id ||
    (subscription.status !== "active" && subscription.status !== "past_due")
  ) {
    return false
  }
  const item = readArray(readRecord(subscription.items).data)[0]
  const priceId = readString(readRecord(item).price, "id")
  return priceId !== undefined && sellsPlan(priceId)
}
