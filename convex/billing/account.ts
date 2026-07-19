import { trial } from "../../contracts/billing"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"

const dayMs = 24 * 60 * 60 * 1000

export async function getAccount(ctx: QueryCtx, tenantId: string) {
  return await ctx.db
    .query("billingAccounts")
    .withIndex("by_tenant", (query) => query.eq("tenantId", tenantId))
    .unique()
}

/**
 * Billing accounts are created lazily on first touch: the tenant starts a
 * trial with the trial grant as included usage and nothing else configured.
 */
export async function ensureAccount(
  ctx: MutationCtx,
  tenantId: string
): Promise<Doc<"billingAccounts">> {
  const existing = await getAccount(ctx, tenantId)

  if (existing !== null) {
    return existing
  }

  const now = Date.now()
  const accountId = await ctx.db.insert("billingAccounts", {
    tenantId,
    state: "trial",
    trialEndsAt: now + trial.days * dayMs,
    includedMicros: trial.grantMicros,
    walletMicros: 0,
    autoTopUpUsedMicros: 0,
    updatedAt: now,
  })

  await ctx.db.insert("billingEntries", {
    tenantId,
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
