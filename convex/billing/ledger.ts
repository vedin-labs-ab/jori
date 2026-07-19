import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"

/**
 * The only writers of billing balances. Debits drain the included allotment
 * first and push any remainder onto the wallet, which is allowed to go
 * negative for in-flight work. Credits and grants are idempotent where a
 * Stripe object id is available.
 */
export async function debitRun(
  ctx: MutationCtx,
  args: {
    account: Doc<"billingAccounts">
    runId: Id<"runs">
    micros: number
    now: number
  }
) {
  const fromIncluded = Math.min(
    Math.max(args.account.includedMicros, 0),
    args.micros
  )
  const fromWallet = args.micros - fromIncluded
  const balanceMicros =
    args.account.includedMicros + args.account.walletMicros - args.micros

  await ctx.db.patch(args.account._id, {
    includedMicros: args.account.includedMicros - fromIncluded,
    walletMicros: args.account.walletMicros - fromWallet,
    updatedAt: args.now,
  })

  const existing = await ctx.db
    .query("billingEntries")
    .withIndex("by_run", (query) => query.eq("runId", args.runId))
    .unique()

  if (existing !== null) {
    await ctx.db.patch(existing._id, {
      amountMicros: existing.amountMicros + args.micros,
      includedMicros:
        (existing.type === "debit" ? (existing.includedMicros ?? 0) : 0) +
        fromIncluded,
      balanceMicros,
      timestamp: args.now,
    })

    return
  }

  await ctx.db.insert("billingEntries", {
    tenantId: args.account.tenantId,
    timestamp: args.now,
    type: "debit",
    amountMicros: args.micros,
    includedMicros: fromIncluded,
    balanceMicros,
    runId: args.runId,
  })
}

/** Returns false when this Stripe payment was already credited. */
export async function creditTopUp(
  ctx: MutationCtx,
  args: {
    account: Doc<"billingAccounts">
    micros: number
    stripeId: string
    auto: boolean
    now: number
  }
) {
  const existing = await ctx.db
    .query("billingEntries")
    .withIndex("by_stripe", (query) => query.eq("stripeId", args.stripeId))
    .unique()

  if (existing !== null) {
    return false
  }

  await ctx.db.patch(args.account._id, {
    walletMicros: args.account.walletMicros + args.micros,
    updatedAt: args.now,
  })

  await ctx.db.insert("billingEntries", {
    tenantId: args.account.tenantId,
    timestamp: args.now,
    type: "topup",
    amountMicros: args.micros,
    balanceMicros:
      args.account.includedMicros + args.account.walletMicros + args.micros,
    stripeId: args.stripeId,
    auto: args.auto,
  })

  return true
}

/** Cycle and plan grants replace the included allotment rather than add to
 *  it: unused included usage does not roll over, only wallet money does. */
export async function grantIncluded(
  ctx: MutationCtx,
  args: {
    account: Doc<"billingAccounts">
    micros: number
    source: "cycle" | "plan"
    now: number
  }
) {
  await ctx.db.patch(args.account._id, {
    includedMicros: args.micros,
    autoTopUpUsedMicros: 0,
    updatedAt: args.now,
  })

  await ctx.db.insert("billingEntries", {
    tenantId: args.account.tenantId,
    timestamp: args.now,
    type: "grant",
    amountMicros: args.micros,
    balanceMicros: args.micros + args.account.walletMicros,
    source: args.source,
  })
}
