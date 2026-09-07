import { plans } from "../../../contracts/billing"
import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { readArray, readRecord, readString } from "../../shared/input"
import { trialRemainderMicros } from "../account"
import { addMonths } from "../cycle"
import { resetAllowance } from "../ledger"
import { stripeRequest } from "./client"
import { belongsToRegion, planForPriceId } from "./config"

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
  const sold = paidSubscriptionPlan(account, session, subscription)
  if (
    sold === undefined ||
    subscriptionId === undefined ||
    customerId === undefined
  ) {
    return
  }
  const now = Date.now()
  await resetAllowance(ctx, {
    account,
    micros:
      plans[sold.plan].monthlyAllowanceMicros +
      trialRemainderMicros(account, now),
    source: "plan",
    now,
  })
  await ctx.db.patch(account._id, {
    state: { kind: "active", ...sold },
    topUp: { charged: { micros: 0 } },
    stripe: { customerId, subscriptionId },
    renewsAt: addMonths(now, 1),
    updatedAt: now,
  })
}

function paidSubscriptionPlan(
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
    return undefined
  }
  const item = readArray(readRecord(subscription.items).data)[0]
  const priceId = readString(readRecord(item).price, "id")
  return priceId === undefined ? undefined : planForPriceId(priceId)
}
