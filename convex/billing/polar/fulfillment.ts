import { microsPerDollar, plan } from "../../../contracts/billing"
import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { isWorkspaceDeleting } from "../../retention/access"
import { resumeWorkspace } from "../../retention/data"
import { readNumber, readRecord, readString } from "../../shared/input"
import { getAccount } from "../account"
import { addMonths } from "../cycle"
import { creditTopUp, resetAllowance } from "../ledger"
import { applyTopUpRefund } from "../refunds/webhook"
import { sellsStorage } from "../storage/config"
import { applyStorageOrder } from "../storage/sync"
import { queueCancellation } from "./cancellation"
import { belongsToRegion, sellsPlan, sellsTopUp } from "./config"

/**
 * Every payment Polar collects is an order, so a paid order is the one way
 * money reaches an account: a top-up funds the wallet, and the first order
 * of a subscription starts the plan. The order must be paid by the customer
 * checkout made for the organization; a webhook never creates an account.
 */
export async function applyPaidOrder(
  ctx: MutationCtx,
  order: Record<string, unknown>
) {
  const organizationId = readString(
    readRecord(order.metadata),
    "organizationId"
  )
  const customerId = readString(order, "customer_id")

  if (
    organizationId === undefined ||
    customerId === undefined ||
    order.paid !== true
  ) {
    return
  }

  const account = await getAccount(ctx, organizationId)

  if (account === null || account.polar?.customerId !== customerId) {
    return
  }

  if (sellsStorage(order.product_id)) {
    await applyStorageOrder(ctx, account, order)
  } else if (sellsTopUp(order.product_id)) {
    await applyTopUp(ctx, account, order)
  } else if (order.billing_reason === "subscription_create") {
    await applyPlan(ctx, account, order, customerId)
  }
}

async function applyTopUp(
  ctx: MutationCtx,
  account: Doc<"accounts">,
  order: Record<string, unknown>
) {
  const orderId = readString(order, "id")
  const cents = readNumber(order, "net_amount")

  if (
    orderId === undefined ||
    cents === undefined ||
    !Number.isSafeInteger(cents) ||
    !Number.isSafeInteger(cents * (microsPerDollar / 100)) ||
    cents <= 0 ||
    order.currency !== "usd"
  ) {
    return
  }

  const auto = readRecord(order.metadata).kind === "auto-top-up"
  const micros = cents * (microsPerDollar / 100)
  const now = Date.now()
  const credited = await creditTopUp(ctx, {
    account,
    micros,
    orderId,
    auto,
    now,
  })

  if (credited && auto) {
    // A successful charge spends the claim and counts against the cap.
    await ctx.db.patch(account._id, {
      topUp: {
        ...account.topUp,
        charged: { micros: account.topUp.charged.micros + micros },
      },
      updatedAt: now,
    })
  }
  await applyTopUpRefund(ctx, account._id, order)
}

async function applyPlan(
  ctx: MutationCtx,
  account: Doc<"accounts">,
  order: Record<string, unknown>,
  customerId: string
) {
  const subscription = readRecord(order.subscription)
  const subscriptionId = readString(subscription, "id")

  if (
    subscriptionId === undefined ||
    !isPaidPlanSubscription(account, order, subscription)
  ) {
    return
  }

  if (
    account.refundHold !== undefined ||
    (await isWorkspaceDeleting(ctx, account.organizationId))
  ) {
    const orderId = String(order.id)
    await queueCancellation(ctx, {
      organizationId: account.organizationId,
      customerId,
      subscriptionId,
      orderId,
    })
    await ctx.db.patch(account._id, {
      refundHold: account.refundHold ?? `late-payment:${orderId}`,
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
    polar: { customerId, subscriptionId },
    renewsAt: addMonths(now, 1),
    updatedAt: now,
  })
}

/** Whether the subscription an order started is the plan, live, and new to
 *  this account. The product is checked against what Polar holds now rather
 *  than the checkout's metadata, so a stale checkout cannot sell something
 *  else. */
function isPaidPlanSubscription(
  account: Doc<"accounts">,
  order: Record<string, unknown>,
  subscription: Record<string, unknown>
) {
  return (
    belongsToRegion(subscription) &&
    subscription.id === order.subscription_id &&
    subscription.customer_id === order.customer_id &&
    readRecord(subscription.metadata).organizationId ===
      account.organizationId &&
    account.polar?.subscriptionId !== subscription.id &&
    (subscription.status === "active" || subscription.status === "past_due") &&
    sellsPlan(subscription.product_id)
  )
}
