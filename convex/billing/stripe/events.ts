import { v } from "convex/values"
import { plans } from "../../../contracts/billing"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { ensureAccount, getAccount } from "../account"
import { addMonths } from "../cycle"
import { creditTopUp, grantIncluded } from "../ledger"
import { readObject, readOptionalString } from "./client"
import { planForPriceId } from "./config"

const autoTopUpFailureCooldownMs = 6 * 60 * 60 * 1000

/**
 * The single place Stripe state enters Milo. Each event is applied in one
 * transaction; money credits are idempotent on the Stripe object id, so
 * webhook retries are harmless.
 */
export const apply = internalMutation({
  args: { event: v.any() },
  handler: async (ctx, args) => {
    const event = readObject(args.event)
    const type = readOptionalString(event?.type)
    const object = readObject(readObject(event?.data)?.object)

    if (event === undefined || type === undefined || object === undefined) {
      return null
    }

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
  const metadata = readObject(session.metadata)
  const tenantId = readOptionalString(metadata?.tenantId)
  const kind = readOptionalString(metadata?.kind)

  if (metadata === undefined || tenantId === undefined) {
    return
  }

  const account = await ensureAccount(ctx, tenantId)
  const customerId = readOptionalString(session.customer)

  if (customerId !== undefined && account.stripeCustomerId === undefined) {
    await ctx.db.patch(account._id, { stripeCustomerId: customerId })
  }

  if (kind === "plan") {
    await applyPlanCheckout(ctx, { account, session, metadata })
  } else if (kind === "top-up") {
    await applyTopUpCheckout(ctx, { account, session, metadata })
  }
}

async function applyPlanCheckout(
  ctx: MutationCtx,
  args: {
    account: Awaited<ReturnType<typeof ensureAccount>>
    session: Record<string, unknown>
    metadata: Record<string, unknown>
  }
) {
  const subscriptionId = readOptionalString(args.session.subscription)
  const plan = readPlanKey(args.metadata.plan)
  const interval = readInterval(args.metadata.interval)

  if (subscriptionId === undefined || plan === undefined) {
    return
  }

  // Retries of an already-applied checkout land here as a no-op.
  if (args.account.stripeSubscriptionId === subscriptionId) {
    return
  }

  const now = Date.now()

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
    micros: plans[plan].includedMonthlyMicros,
    source: "plan",
    now,
  })
}

async function applyTopUpCheckout(
  ctx: MutationCtx,
  args: {
    account: Awaited<ReturnType<typeof ensureAccount>>
    session: Record<string, unknown>
    metadata: Record<string, unknown>
  }
) {
  const sessionId = readOptionalString(args.session.id)
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
  const status = readOptionalString(subscription.status)
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
  const metadata = readObject(intent.metadata)
  const tenantId = readOptionalString(metadata?.tenantId)

  if (readOptionalString(metadata?.kind) !== "auto-top-up") {
    return
  }

  const account =
    tenantId === undefined ? null : await getAccount(ctx, tenantId)

  if (account === null) {
    return
  }

  const now = Date.now()

  if (!args.succeeded) {
    await ctx.db.patch(account._id, {
      autoTopUpHoldUntil: now + autoTopUpFailureCooldownMs,
      updatedAt: now,
    })

    return
  }

  const intentId = readOptionalString(intent.id)
  const micros = readMicros(metadata?.micros)

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
  const tenantId = readOptionalString(
    readObject(subscription.metadata)?.tenantId
  )

  if (tenantId !== undefined) {
    return await getAccount(ctx, tenantId)
  }

  const customerId = readOptionalString(subscription.customer)

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
  const items = readObject(subscription.items)
  const data = Array.isArray(items?.data) ? items.data : []
  const price = readObject(readObject(data[0])?.price)
  const priceId = readOptionalString(price?.id)

  return priceId === undefined ? undefined : planForPriceId(priceId)
}

function readPlanKey(value: unknown) {
  return value === "starter" || value === "team" ? value : undefined
}

function readInterval(value: unknown) {
  return value === "month" || value === "year" ? value : undefined
}

function readMicros(value: unknown) {
  const micros = typeof value === "string" ? Number(value) : Number.NaN

  return Number.isInteger(micros) && micros > 0 ? micros : undefined
}
