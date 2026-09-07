import { v } from "convex/values"
import {
  autoTopUp,
  billingIntervals,
  planKeys,
  plans,
} from "../../../contracts/billing"
import { type Doc } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { readArray, readRecord, readString } from "../../shared/input"
import { getAccount, holdAutoTopUp, trialRemainderMicros } from "../account"
import { addMonths } from "../cycle"
import { creditTopUp, resetAllowance } from "../ledger"
import { belongsToRegion, planForPriceId } from "./config"

/**
 * The single place Stripe state enters Jori. Each event is applied in one
 * transaction; money credits are idempotent on the Stripe object id, so
 * webhook retries are harmless, and malformed payloads fall through as
 * no-ops.
 */
export const apply = internalMutation({
  args: { event: v.any() },
  handler: async (ctx, args) => {
    const type = readString(args.event, "type")
    const object = readRecord(readRecord(readRecord(args.event).data).object)
    if (!belongsToRegion(object)) {
      return null
    }
    const deleted = type === "customer.subscription.deleted"
    const paid = type === "payment_intent.succeeded"

    if (type === "checkout.session.completed") {
      await applyCheckoutCompleted(ctx, object)
    } else if (type === "customer.subscription.updated" || deleted) {
      await applySubscription(ctx, object, deleted)
    } else if (paid || type === "payment_intent.payment_failed") {
      await applyPaymentIntent(ctx, object, paid)
    }

    return null
  },
})

async function applyCheckoutCompleted(
  ctx: MutationCtx,
  session: Record<string, unknown>
) {
  const metadata = readRecord(session.metadata)
  const organizationId = readString(metadata, "organizationId")

  if (organizationId === undefined || session.payment_status !== "paid") {
    return
  }

  const account = await getAccount(ctx, organizationId)
  const customerId = readString(session, "customer")

  if (
    account === null ||
    customerId === undefined ||
    account.stripe?.customerId !== customerId
  ) {
    return
  }

  const kind = readString(metadata, "kind")

  if (kind === "plan") {
    await applyPlanCheckout(ctx, account, session, customerId)
  } else if (kind === "top-up") {
    await applyTopUpCheckout(ctx, account, session)
  }
}

async function applyPlanCheckout(
  ctx: MutationCtx,
  account: Doc<"accounts">,
  session: Record<string, unknown>,
  customerId: string | undefined
) {
  const metadata = readRecord(session.metadata)
  const subscriptionId = readString(session, "subscription")
  const plan = planKeys.find((key) => key === metadata.plan)
  const interval = billingIntervals.find(
    (candidate) => candidate === metadata.interval
  )

  // An active plan is a plan, an interval, a customer, and a subscription to
  // bill it; a payload short of any of them is not a purchase to record.
  // Retries of an already-applied checkout are a no-op for the same reason.
  if (
    subscriptionId === undefined ||
    plan === undefined ||
    interval === undefined ||
    customerId === undefined ||
    account.stripe?.subscriptionId === subscriptionId
  ) {
    return
  }

  const now = Date.now()

  await resetAllowance(ctx, {
    account,
    micros:
      plans[plan].monthlyAllowanceMicros + trialRemainderMicros(account, now),
    source: "plan",
    now,
  })

  // Written after the allowance so it wins the shared `topUp` object: a fresh
  // plan starts without whatever auto top-up the trial had configured.
  await ctx.db.patch(account._id, {
    state: { kind: "active", plan, interval },
    topUp: { charged: { micros: 0 } },
    stripe: { customerId, subscriptionId },
    renewsAt: addMonths(now, 1),
    updatedAt: now,
  })
}

async function applyTopUpCheckout(
  ctx: MutationCtx,
  account: Doc<"accounts">,
  session: Record<string, unknown>
) {
  const sessionId = readString(session, "id")
  const micros = readMicros(readRecord(session.metadata).micros)

  if (sessionId === undefined || micros === undefined) {
    return
  }

  await creditTopUp(ctx, {
    account,
    micros,
    stripeId: sessionId,
    auto: false,
    now: Date.now(),
  })
}

/**
 * Portal plan switches, payment recovery, and cancellations all arrive here.
 * `past_due` stays active: Stripe keeps retrying the card, prepaid usage
 * bounds the exposure, and pausing on a flaky card would be hostile.
 */
async function applySubscription(
  ctx: MutationCtx,
  subscription: Record<string, unknown>,
  deleted: boolean
) {
  const account = await findSubscriptionAccount(ctx, subscription)
  const sold =
    account === null ? undefined : subscribedPlan(account, subscription)

  if (account === null || sold === undefined) {
    return
  }

  const now = Date.now()
  const status = readString(subscription, "status")
  const ended =
    deleted ||
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete_expired"

  if (ended) {
    await ctx.db.patch(account._id, {
      state: { kind: "paused", ...sold },
      renewsAt: undefined,
      // The customer outlives the subscription: the saved card and the
      // invoice history stay reachable after a cancellation.
      stripe: account.stripe && { customerId: account.stripe.customerId },
      updatedAt: now,
    })

    return
  }

  if (status !== "active" && status !== "past_due") {
    return
  }

  const resumed = account.state.kind !== "active" && status === "active"
  const planChanged =
    account.state.kind === "active" && account.state.plan !== sold.plan

  await ctx.db.patch(account._id, {
    state: { kind: "active", ...sold },
    ...(resumed && account.renewsAt === undefined
      ? { renewsAt: addMonths(now, 1) }
      : {}),
    updatedAt: now,
  })

  if (planChanged || resumed) {
    await resetAllowance(ctx, {
      account,
      micros: plans[sold.plan].monthlyAllowanceMicros,
      source: "plan",
      now,
    })
  }
}

/** Which plan a subscription change applies to: what Stripe now sells,
 *  falling back to what the account carries. A trial that bought nothing has
 *  neither, so there is nothing to pause or resume. */
function subscribedPlan(
  account: Doc<"accounts">,
  subscription: Record<string, unknown>
) {
  const item = readArray(readRecord(subscription.items).data)[0]
  const priceId = readString(readRecord(item).price, "id")
  const state = account.state

  return (
    (priceId === undefined ? undefined : planForPriceId(priceId)) ??
    (state.kind === "trial"
      ? undefined
      : { plan: state.plan, interval: state.interval })
  )
}

async function applyPaymentIntent(
  ctx: MutationCtx,
  intent: Record<string, unknown>,
  succeeded: boolean
) {
  const metadata = readRecord(intent.metadata)

  if (readString(metadata, "kind") !== "auto-top-up") {
    return
  }

  const organizationId = readString(metadata, "organizationId")
  const account =
    organizationId === undefined ? null : await getAccount(ctx, organizationId)

  if (account === null) {
    return
  }

  const now = Date.now()

  if (!succeeded) {
    await holdAutoTopUp(ctx, account, now + autoTopUp.cooldownMs)

    return
  }

  const intentId = readString(intent, "id")
  const micros = readMicros(metadata.micros)

  if (intentId === undefined || micros === undefined) {
    return
  }

  const credited = await creditTopUp(ctx, {
    account,
    micros,
    stripeId: intentId,
    auto: true,
    now,
  })

  if (credited) {
    // A successful charge spends the claim and counts against the cap.
    await ctx.db.patch(account._id, {
      topUp: {
        ...account.topUp,
        charged: { micros: account.topUp.charged.micros + micros },
      },
      updatedAt: now,
    })
  }
}

async function findSubscriptionAccount(
  ctx: MutationCtx,
  subscription: Record<string, unknown>
) {
  const organizationId = readString(
    readRecord(subscription.metadata),
    "organizationId"
  )

  if (organizationId !== undefined) {
    return await getAccount(ctx, organizationId)
  }

  const customerId = readString(subscription, "customer")

  if (customerId === undefined) {
    return null
  }

  return await ctx.db
    .query("accounts")
    .withIndex("by_stripe_customer", (query) =>
      query.eq("stripe.customerId", customerId)
    )
    .unique()
}

function readMicros(value: unknown) {
  const micros = typeof value === "string" ? Number(value) : Number.NaN

  return Number.isInteger(micros) && micros > 0 ? micros : undefined
}
