import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"

/**
 * The only writers of billing balances. Debits drain the monthly allowance
 * first and push any remainder onto the wallet, which is allowed to go
 * negative for in-flight work. Credits and allowances are idempotent where a
 * Stripe object id is available.
 */
export async function debitRun(
  ctx: MutationCtx,
  args: {
    account: Doc<"accounts">
    runId: Id<"runs">
    micros: number
    tokens: { input: number; output: number }
    now: number
  }
) {
  const { allowance, wallet } = args.account.micros
  const fromAllowance = Math.min(Math.max(allowance, 0), args.micros)
  const balance = allowance + wallet - args.micros

  await ctx.db.patch(args.account._id, {
    micros: {
      allowance: allowance - fromAllowance,
      wallet: wallet - (args.micros - fromAllowance),
    },
    updatedAt: args.now,
  })

  // Only debits carry a run, so the run index can return nothing else.
  const existing = await ctx.db
    .query("transactions")
    .withIndex("by_run", (query) => query.eq("runId", args.runId))
    .unique()

  if (existing !== null && existing.type === "debit") {
    await ctx.db.patch(existing._id, {
      micros: {
        amount: existing.micros.amount + args.micros,
        allowance: existing.micros.allowance + fromAllowance,
        balance,
      },
      tokens: {
        input: existing.tokens.input + args.tokens.input,
        output: existing.tokens.output + args.tokens.output,
      },
      timestamp: args.now,
    })

    return
  }

  await ctx.db.insert("transactions", {
    organizationId: args.account.organizationId,
    timestamp: args.now,
    type: "debit",
    micros: { amount: args.micros, allowance: fromAllowance, balance },
    tokens: args.tokens,
    runId: args.runId,
  })
}

/** Returns false when this Stripe payment was already credited. */
export async function creditTopUp(
  ctx: MutationCtx,
  args: {
    account: Doc<"accounts">
    micros: number
    stripeId: string
    auto: boolean
    now: number
  }
) {
  const existing = await ctx.db
    .query("transactions")
    .withIndex("by_stripe", (query) => query.eq("stripeId", args.stripeId))
    .unique()

  if (existing !== null) {
    return false
  }

  const { allowance, wallet } = args.account.micros

  await ctx.db.patch(args.account._id, {
    micros: { allowance, wallet: wallet + args.micros },
    updatedAt: args.now,
  })

  await ctx.db.insert("transactions", {
    organizationId: args.account.organizationId,
    timestamp: args.now,
    type: "topup",
    micros: {
      amount: args.micros,
      balance: allowance + wallet + args.micros,
    },
    stripeId: args.stripeId,
    auto: args.auto,
  })

  return true
}

/**
 * Cycle and plan allowances replace the monthly pot rather than add to it:
 * unused allowance does not roll over, only wallet money does. A fresh month
 * also gives auto top-up its full cap back.
 */
export async function resetAllowance(
  ctx: MutationCtx,
  args: {
    account: Doc<"accounts">
    micros: number
    source: "cycle" | "plan"
    now: number
  }
) {
  const { topUp, micros } = args.account

  await ctx.db.patch(args.account._id, {
    micros: { allowance: args.micros, wallet: micros.wallet },
    topUp: { ...topUp, charged: { ...topUp.charged, micros: 0 } },
    updatedAt: args.now,
  })

  await ctx.db.insert("transactions", {
    organizationId: args.account.organizationId,
    timestamp: args.now,
    type: "allowance",
    micros: { amount: args.micros, balance: args.micros + micros.wallet },
    source: args.source,
  })
}
