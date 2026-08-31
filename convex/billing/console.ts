import { v } from "convex/values"
import { autoTopUp, dollarsToMicros } from "../../contracts/billing"
import { type Doc } from "../_generated/dataModel"
import { mutation, type QueryCtx, query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { ensureAccount, getAccount, requireActivePlan } from "./account"

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

function publicAccount(account: Doc<"accounts">) {
  return {
    state: account.state,
    micros: account.micros,
    renewsAt: account.renewsAt,
    topUp: account.topUp,
    hasStripeCustomer: account.stripe !== undefined,
    canFundWallet: account.state.kind === "active",
  }
}

async function readEntries(ctx: QueryCtx, organizationId: string) {
  const entries = await ctx.db
    .query("transactions")
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
 * Auto top-up requires an active plan and a saved card. Switching it off drops
 * the policy alone: what it has already charged this month, and any live
 * claim, outlive the knobs.
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
        topUp: { charged: account.topUp.charged },
        updatedAt: Date.now(),
      })

      return null
    }

    requireActivePlan(account)

    if (!autoTopUp.thresholdsUsd.includes(args.config.thresholdUsd)) {
      throw new Error("Pick one of the offered thresholds.")
    }

    if (!autoTopUp.amountsUsd.includes(args.config.amountUsd)) {
      throw new Error("Pick one of the offered top-up amounts.")
    }

    if (!autoTopUp.monthlyCapsUsd.includes(args.config.monthlyCapUsd)) {
      throw new Error("Pick one of the offered monthly caps.")
    }

    if (account.stripe === undefined) {
      throw new Error(
        "Add a payment method to the active plan before enabling auto top-up."
      )
    }

    await ctx.db.patch(account._id, {
      topUp: {
        micros: {
          threshold: dollarsToMicros(args.config.thresholdUsd),
          amount: dollarsToMicros(args.config.amountUsd),
          cap: dollarsToMicros(args.config.monthlyCapUsd),
        },
        charged: account.topUp.charged,
      },
      updatedAt: Date.now(),
    })

    return null
  },
})
