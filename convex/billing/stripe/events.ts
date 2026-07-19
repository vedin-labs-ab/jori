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
import {
  ensureAccount,
  getAccount,
  holdAutoTopUp,
  trialRemainderMicros,
} from "../account"
import { addMonths } from "../cycle"
import { creditTopUp, grantIncluded } from "../ledger"
import { planForPriceId } from "./config"

/**
 * The single place Stripe state enters Milo. Each event is applied in one
 * transaction; money credits are idempotent on the Stripe object id, so
 * webhook retries are harmless, and malformed payloads fall through as
 * no-ops.
 */
export const apply = internalMutation({
  args: { event: v.any() },
  handler: async (ctx, args) => {
    const type = readString(args.event, "type")
    const object = readRecord(readRecord(readRecord(args.event).data).object)

    if (type === "checkout.session.completed") {
      await applyCheckoutCompleted(ctx, object)
    } else if (
      type === "customer.subscription.updated" ||
      type === "customer.subscription.deleted"
    ) {
      await applySubscription(ctx, object, {
        deleted: type === "customer.subscription.deleted",
      })
    } else if (
      type === "payment_intent.succeeded" ||
      type === "payment_intent.payment_failed"
    ) {
      await applyPaymentIntent(ctx, object, {
        succeeded: type === "payment_intent.succeeded",
      })
    }

    return null
  },
})

async function applyCheckoutCompleted(
  ctx: MutationCtx,
  session: Record<string, unknown>
) {
  const metadata = readRecord(session.metadata)
  const tenantId = readString(metadata, "tenantId")

  if (tenantId === undefined) {
    return
  }

  const account = await ensureAccount(ctx, tenantId)
  const customerId = readString(session, "customer")

  if (customerId !== undefined && account.stripeCustomerId === undefined) {
    await ctx.db.patch(account._id, { stripeCustomerId: customerId })
  }

  const kind = readString(metadata, "kind")

  if (kind === "plan") {
    await applyPlanCheckout(ctx, { account, session, metadata })
  } else if (kind === "top-up") {
    await applyTopUpCheckout(ctx, { account, session, metadata })
  }
}

async function applyPlanCheckout(
  ctx: MutationCtx,
  args: {
    account: Doc<"billingAccounts">
    session: Record<string, unknown>
    metadata: Record<string, unknown>
  }
) {
  const subscriptionId = readString(args.session, "subscription")
  const plan = planKeys.find((key) => key === args.metadata.plan)
  const interval = billingIntervals.find(
    (candidate) => candidate === args.metadata.interval
  )

  if (subscriptionId === undefined || plan === undefined) {
    return
  }

  // Retries of an already-applied checkout land here as a no-op.
  if (args.account.stripeSubscriptionId === subscriptionId) {
    return
  }

  const now = Date.now()
  const remainderMicros = trialRemainderMicros(args.account, now)

  await ctx.db.patch(args.account._id, {
    state: "active",
    plan,
    interval,
    trialEndsAt: undefined,
    stripeSubscriptionId: subscriptionId,
    nextGrantAt: addMonths(now, 1),
    updatedAt: now,
  })

  await grantIncluded(ctx, {
    account: args.account,
    micros: plans[plan].includedMonthlyMicros + remainderMicros,
    source: "plan",
    now,
  })
}

async function applyTopUpCheckout(
  ctx: MutationCtx,
  args: {
    account: Doc<"billingAccounts">
    session: Record<string, unknown>
    metadata: Record<string, unknown>
  }
) {
  const sessionId = readString(args.session, "id")
  const micros = readMicros(args.metadata.micros)

  if (sessionId === undefined || micros === undefined) {
    return
  }

  await creditTopUp(ctx, {
    account: args.account,
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
  args: { deleted: boolean }
) {
  const account = await findSubscriptionAccount(ctx, subscription)

  if (account === null) {
    return
  }

  const now = Date.now()
  const status = readString(subscription, "status")
  const ended =
    args.deleted ||
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete_expired"

  if (ended) {
    await ctx.db.patch(account._id, {
      state: "paused",
      nextGrantAt: undefined,
      stripeSubscriptionId: undefined,
      updatedAt: now,
    })

    return
  }

  const priced = readSubscriptionPlan(subscription)
  const planChanged = priced !== undefined && priced.plan !== account.plan
  const resumed = account.state !== "active" && status === "active"

  await ctx.db.patch(account._id, {
    ...(status === "active" || status === "past_due"
      ? { state: "active" as const }
      : {}),
    ...(priced ?? {}),
    ...(resumed && account.nextGrantAt === undefined
      ? { nextGrantAt: addMonths(now, 1) }
      : {}),
    updatedAt: now,
  })

  if ((planChanged || resumed) && priced !== undefined) {
    await grantIncluded(ctx, {
      account,
      micros: plans[priced.plan].includedMonthlyMicros,
      source: "plan",
      now,
    })
  }
}

async function applyPaymentIntent(
  ctx: MutationCtx,
  intent: Record<string, unknown>,
  args: { succeeded: boolean }
) {
  const metadata = readRecord(intent.metadata)

  if (readString(metadata, "kind") !== "auto-top-up") {
    return
  }

  const tenantId = readString(metadata, "tenantId")
  const account =
    tenantId === undefined ? null : await getAccount(ctx, tenantId)

  if (account === null) {
    return
  }

  const now = Date.now()

  if (!args.succeeded) {
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
    await ctx.db.patch(account._id, {
      autoTopUpUsedMicros: account.autoTopUpUsedMicros + micros,
      autoTopUpHoldUntil: undefined,
      updatedAt: now,
    })
  }
}

async function findSubscriptionAccount(
  ctx: MutationCtx,
  subscription: Record<string, unknown>
) {
  const tenantId = readString(readRecord(subscription.metadata), "tenantId")

  if (tenantId !== undefined) {
    return await getAccount(ctx, tenantId)
  }

  const customerId = readString(subscription, "customer")

  if (customerId === undefined) {
    return null
  }

  return await ctx.db
    .query("billingAccounts")
    .withIndex("by_stripe_customer", (query) =>
      query.eq("stripeCustomerId", customerId)
    )
    .unique()
}

function readSubscriptionPlan(subscription: Record<string, unknown>) {
  const item = readArray(readRecord(subscription.items).data)[0]
  const priceId = readString(readRecord(item).price, "id")

  return priceId === undefined ? undefined : planForPriceId(priceId)
}

function readMicros(value: unknown) {
  const micros = typeof value === "string" ? Number(value) : Number.NaN

  return Number.isInteger(micros) && micros > 0 ? micros : undefined
}
