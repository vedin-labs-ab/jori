import { type Doc } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { insertRow } from "../retention/write"

export async function getAccount(ctx: QueryCtx, organizationId: string) {
  return await ctx.db
    .query("accounts")
    .withIndex("by_organization", (query) =>
      query.eq("organizationId", organizationId)
    )
    .unique()
}

/**
 * Billing accounts are created lazily on first touch: the organization starts
 * unsubscribed, with nothing in either pot and nothing else configured, and
 * runs nothing until a plan is bought.
 */
export async function ensureAccount(
  ctx: MutationCtx,
  organizationId: string
): Promise<Doc<"accounts">> {
  const existing = await getAccount(ctx, organizationId)

  if (existing !== null) {
    return existing
  }

  const now = Date.now()
  return await insertRow(ctx, "accounts", {
    organizationId,
    state: { kind: "unsubscribed" },
    micros: { allowance: 0, wallet: 0 },
    topUp: { charged: { micros: 0 } },
    updatedAt: now,
  })
}

export function availableMicros(account: Doc<"accounts">) {
  return account.micros.allowance + account.micros.wallet
}

export function requireNoRefundHold(account: Doc<"accounts">) {
  if (account.refundHold !== undefined) {
    throw new Error("Billing is paused while support settles a refund.")
  }
}

export function requireActivePlan(account: Doc<"accounts">) {
  requireNoRefundHold(account)
  if (account.state.kind !== "active") {
    throw new Error("An active plan is required to fund the wallet.")
  }
}

/**
 * Owns the auto-top-up claim window: set while a charge attempt is in
 * flight, extended into a cooldown after a decline, cleared on success. A
 * patch rewrites `topUp` whole, so the policy and the charged total travel
 * along with the claim.
 */
export async function holdAutoTopUp(
  ctx: MutationCtx,
  account: Doc<"accounts">,
  releaseAt: number | undefined
) {
  await ctx.db.patch(account._id, {
    topUp: {
      ...account.topUp,
      charged: { ...account.topUp.charged, releaseAt },
    },
    updatedAt: Date.now(),
  })
}
