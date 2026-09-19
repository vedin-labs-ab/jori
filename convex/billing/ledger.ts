import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { getAccount } from "./account"

/**
 * The only writers of billing balances. Debits drain the monthly allowance
 * first and push any remainder onto the wallet, which is allowed to go
 * negative for in-flight work. Credits and allowances are idempotent where a
 * Polar order id is available.
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

/** Returns false when this Polar order was already credited. */
export async function creditTopUp(
  ctx: MutationCtx,
  args: {
    account: Doc<"accounts">
    micros: number
    orderId: string
    auto: boolean
    now: number
  }
) {
  const existing = await ctx.db
    .query("transactions")
    .withIndex("by_order", (query) => query.eq("orderId", args.orderId))
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
    orderId: args.orderId,
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

type AllowanceGrant = {
  organizationId: string
  micros: number
  idempotencyKey: string
  reason: string
  operator: string
}

/** Add a non-billable grant without renewing the cycle or changing the plan. */
export async function grantAllowance(ctx: MutationCtx, args: AllowanceGrant) {
  validateGrant(args)
  const existing = await ctx.db
    .query("transactions")
    .withIndex("by_idempotencyKey", (query) =>
      query.eq("idempotencyKey", args.idempotencyKey)
    )
    .unique()

  if (existing !== null) {
    requireSameGrant(existing, args)
    return { transactionId: existing._id, applied: false }
  }

  const account = await getAccount(ctx, args.organizationId)
  if (account === null) {
    throw new Error("An existing billing account is required.")
  }
  const allowance = account.micros.allowance + args.micros
  const balance = allowance + account.micros.wallet
  if (!Number.isSafeInteger(allowance) || !Number.isSafeInteger(balance)) {
    throw new Error("The resulting balance must be a safe integer.")
  }
  const now = Date.now()
  await ctx.db.patch(account._id, {
    micros: { allowance, wallet: account.micros.wallet },
    updatedAt: now,
  })
  const transactionId = await ctx.db.insert("transactions", {
    organizationId: args.organizationId,
    timestamp: now,
    type: "allowance",
    source: "manual",
    micros: { amount: args.micros, balance },
    idempotencyKey: args.idempotencyKey,
    reason: args.reason,
    operator: args.operator,
  })
  return { transactionId, applied: true }
}

function validateGrant(args: AllowanceGrant) {
  if (
    !Number.isSafeInteger(args.micros) ||
    args.micros < 1 ||
    args.micros > 1_000_000_000
  ) {
    throw new Error(
      "Grant must be an integer between 1 and 1,000,000,000 micros."
    )
  }
  for (const [label, value, maximum] of [
    ["Idempotency key", args.idempotencyKey, 200],
    ["Reason", args.reason, 1000],
    ["Operator", args.operator, 200],
  ] as const) {
    if (
      value.trim() !== value ||
      value.length === 0 ||
      value.length > maximum
    ) {
      throw new Error(
        `${label} must be nonempty, trimmed, and at most ${maximum} characters.`
      )
    }
  }
}

function requireSameGrant(entry: Doc<"transactions">, args: AllowanceGrant) {
  if (
    entry.type !== "allowance" ||
    entry.source !== "manual" ||
    entry.organizationId !== args.organizationId ||
    entry.micros.amount !== args.micros ||
    entry.reason !== args.reason ||
    entry.operator !== args.operator
  ) {
    throw new Error("Idempotency key already belongs to a different grant.")
  }
}
