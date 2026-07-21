import { trial } from "../../contracts/billing"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"

const dayMs = 24 * 60 * 60 * 1000

export async function getAccount(ctx: QueryCtx, organizationId: string) {
  return await ctx.db
    .query("billingAccounts")
    .withIndex("by_organization", (query) =>
      query.eq("organizationId", organizationId)
    )
    .unique()
}

/**
 * Billing accounts are created lazily on first touch: the organization starts a
 * trial with the trial grant as included usage and nothing else configured.
 */
export async function ensureAccount(
  ctx: MutationCtx,
  organizationId: string
): Promise<Doc<"billingAccounts">> {
  const existing = await getAccount(ctx, organizationId)

  if (existing !== null) {
    return existing
  }

  const now = Date.now()
  const accountId = await ctx.db.insert("billingAccounts", {
    organizationId,
    state: "trial",
    trialEndsAt: now + trial.days * dayMs,
    includedMicros: trial.grantMicros,
    walletMicros: 0,
    autoTopUpUsedMicros: 0,
    updatedAt: now,
  })

  await ctx.db.insert("billingEntries", {
    organizationId,
    timestamp: now,
    type: "grant",
    amountMicros: trial.grantMicros,
    balanceMicros: trial.grantMicros,
    source: "trial",
  })

  const account = await ctx.db.get(accountId)

  if (account === null) {
    throw new Error("Billing account insert failed.")
  }

  return account
}

export function availableMicros(account: Doc<"billingAccounts">) {
  return account.includedMicros + account.walletMicros
}

export function hasActivePlan(account: Doc<"billingAccounts">) {
  return account.state === "active" && account.plan !== undefined
}

export function requireActivePlan(account: Doc<"billingAccounts">) {
  if (!hasActivePlan(account)) {
    throw new Error("An active plan is required to fund the wallet.")
  }
}

/**
 * Subscribing mid-trial keeps the unspent trial usage: it folds into the
 * first cycle's allotment and expires with it. An already-expired trial
 * brings nothing along.
 */
export function trialRemainderMicros(
  account: Doc<"billingAccounts">,
  now: number
) {
  const live =
    account.state === "trial" &&
    (account.trialEndsAt === undefined || account.trialEndsAt >= now)

  return live ? Math.max(account.includedMicros, 0) : 0
}

/**
 * Owns the auto-top-up claim window: set while a charge attempt is in
 * flight, extended into a cooldown after a decline, cleared on success.
 */
export async function holdAutoTopUp(
  ctx: MutationCtx,
  account: Doc<"billingAccounts">,
  untilMs: number | undefined
) {
  await ctx.db.patch(account._id, {
    autoTopUpHoldUntil: untilMs,
    updatedAt: Date.now(),
  })
}
