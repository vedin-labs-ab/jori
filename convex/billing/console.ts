import { v } from "convex/values"
import { autoTopUp, dollarsToMicros } from "../../contracts/billing"
import { type Doc } from "../_generated/dataModel"
import { mutation, type QueryCtx, query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { ensureAccount, getAccount } from "./account"

const entryPageSize = 30

/**
 * Everything Billing settings renders. `account` is null until the
 * organization's first metered run or checkout creates one; the view shows the
 * trial as not yet started in that case.
 */
export const overview = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const account = await getAccount(ctx, args.organizationId)

    return {
      account: account === null ? null : publicAccount(account),
      entries:
        account === null ? [] : await readEntries(ctx, args.organizationId),
    }
  },
})

function publicAccount(account: Doc<"billingAccounts">) {
  return {
    state: account.state,
    plan: account.plan,
    interval: account.interval,
    trialEndsAt: account.trialEndsAt,
    includedMicros: account.includedMicros,
    walletMicros: account.walletMicros,
    nextGrantAt: account.nextGrantAt,
    autoTopUp: account.autoTopUp,
    autoTopUpUsedMicros: account.autoTopUpUsedMicros,
    hasStripeCustomer: account.stripeCustomerId !== undefined,
  }
}

async function readEntries(ctx: QueryCtx, organizationId: string) {
  const entries = await ctx.db
    .query("billingEntries")
    .withIndex("by_organization_and_timestamp", (query) =>
      query.eq("organizationId", organizationId)
    )
    .order("desc")
    .take(entryPageSize)

  return await Promise.all(
    entries.map(async (entry) => {
      if (entry.type !== "debit") {
        return entry
      }

      const run = await ctx.db.get(entry.runId)

      return { ...entry, runTitle: run?.snapshot.title }
    })
  )
}

/**
 * Auto top-up needs a saved card, which arrives with any completed checkout,
 * so enabling it is gated on the Stripe customer existing.
 */
export const configureAutoTopUp = mutation({
  args: {
    organizationId: v.string(),
    config: v.union(
      v.null(),
      v.object({
        thresholdUsd: v.number(),
        amountUsd: v.number(),
        monthlyCapUsd: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const account = await ensureAccount(ctx, args.organizationId)

    if (args.config === null) {
      await ctx.db.patch(account._id, {
        autoTopUp: undefined,
        autoTopUpHoldUntil: undefined,
        updatedAt: Date.now(),
      })

      return null
    }

    if (!autoTopUp.thresholdsUsd.includes(args.config.thresholdUsd)) {
      throw new Error("Pick one of the offered thresholds.")
    }

    if (!autoTopUp.amountsUsd.includes(args.config.amountUsd)) {
      throw new Error("Pick one of the offered top-up amounts.")
    }

    if (!autoTopUp.monthlyCapsUsd.includes(args.config.monthlyCapUsd)) {
      throw new Error("Pick one of the offered monthly caps.")
    }

    if (account.stripeCustomerId === undefined) {
      throw new Error(
        "Add a payment method first: subscribe or make a top-up, and the card is saved for auto top-ups."
      )
    }

    await ctx.db.patch(account._id, {
      autoTopUp: {
        thresholdMicros: dollarsToMicros(args.config.thresholdUsd),
        amountMicros: dollarsToMicros(args.config.amountUsd),
        monthlyCapMicros: dollarsToMicros(args.config.monthlyCapUsd),
      },
      updatedAt: Date.now(),
    })

    return null
  },
})
