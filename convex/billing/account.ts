import { trial } from "../../contracts/billing"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { insertRow } from "../shared/context"

const dayMs = 24 * 60 * 60 * 1000

export async function getAccount(ctx: QueryCtx, organizationId: string) {
  return await ctx.db
    .query("accounts")
    .withIndex("by_organization", (query) =>
      query.eq("organizationId", organizationId)
    )
    .unique()
}

/**
 * Billing accounts are created lazily on first touch: the organization starts a
 * trial with the trial allowance in the monthly pot and nothing else
 * configured.
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
  const account = await insertRow(ctx, "accounts", {
    organizationId,
    state: { kind: "trial", endsAt: now + trial.days * dayMs },
    micros: { allowance: trial.allowanceMicros, wallet: 0 },
    topUp: { charged: { micros: 0 } },
    updatedAt: now,
  })

  await ctx.db.insert("transactions", {
    organizationId,
    timestamp: now,
    type: "allowance",
    micros: { amount: trial.allowanceMicros, balance: trial.allowanceMicros },
    source: "trial",
  })

  return account
}

export function availableMicros(account: Doc<"accounts">) {
  return account.micros.allowance + account.micros.wallet
}

export function requireActivePlan(account: Doc<"accounts">) {
  if (account.state.kind !== "active") {
    throw new Error("An active plan is required to fund the wallet.")
  }
}

/**
 * Subscribing mid-trial keeps the unspent trial usage: it folds into the
 * first cycle's allowance and expires with it. An already-expired trial
 * brings nothing along.
 */
export function trialRemainderMicros(account: Doc<"accounts">, now: number) {
  const live = account.state.kind === "trial" && account.state.endsAt >= now

  return live ? Math.max(account.micros.allowance, 0) : 0
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
