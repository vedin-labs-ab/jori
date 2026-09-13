import { v } from "convex/values"
import { autoTopUp, plan } from "../../../contracts/billing"
import { type Doc } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { isWorkspaceDeleting } from "../../retention/access"
import { resumeWorkspace, retainWorkspace } from "../../retention/data"
import { readArray, readRecord, readString } from "../../shared/input"
import { getAccount, holdAutoTopUp } from "../account"
import { addMonths } from "../cycle"
import { creditTopUp, resetAllowance } from "../ledger"
import { belongsToRegion, sellsPlan } from "./config"
import { applyPlanCheckout, isCheckoutSuccess } from "./fulfillment"

/**
 * The single place Stripe state enters Jori. Each event is applied in one
 * transaction; money credits are idempotent on the Stripe object id, so
 * webhook retries are harmless, and malformed payloads fall through as
 * no-ops.
 */
export const apply = internalMutation({
  args: { event: v.any(), subscription: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const type = readString(args.event, "type")
    const object = readRecord(readRecord(readRecord(args.event).data).object)
    if (!belongsToRegion(object)) {
      return null
    }
    const deleted = type === "customer.subscription.deleted"
    const paid = type === "payment_intent.succeeded"

    if (isCheckoutSuccess(type)) {
      await applyCheckoutCompleted(ctx, object, readRecord(args.subscription))
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
  session: Record<string, unknown>,
  subscription: Record<string, unknown>
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
    await applyPlanCheckout(ctx, account, session, subscription)
  } else if (kind === "top-up") {
    await applyTopUpCheckout(ctx, account, session)
  }
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
  // Delayed payments can mark a subscription active before funds settle.
  // Only a paid checkout may attach the first subscription to an account.
  if (account?.stripe?.subscriptionId !== readString(subscription, "id")) {
    return
  }
  if (account === null || !isPlanSubscription(account, subscription)) {
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
    const endedAt = subscriptionEnd(subscription, now)
    await retainWorkspace(ctx, account.organizationId, endedAt)
    await ctx.db.patch(account._id, {
      state: { kind: "paused" },
      renewsAt: undefined,
      // The customer outlives the subscription: the saved card and the
      // invoice history stay reachable after a cancellation.
      stripe: account.stripe && { customerId: account.stripe.customerId },
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

/** Whether a subscription change is about the plan: what Stripe now sells,
 *  falling back to the account already being on it. An unsubscribed account
 *  has neither, so there is nothing to pause or resume. */
function isPlanSubscription(
  account: Doc<"accounts">,
  subscription: Record<string, unknown>
) {
  const item = readArray(readRecord(subscription.items).data)[0]
  const priceId = readString(readRecord(item).price, "id")

  return (
    (priceId !== undefined && sellsPlan(priceId)) ||
    account.state.kind !== "unsubscribed"
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
  return typeof subscription.ended_at === "number"
    ? Math.min(now, subscription.ended_at * 1000)
    : now
}
