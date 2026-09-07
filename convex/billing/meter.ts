import { autoTopUp, priceTokens } from "../../contracts/billing"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { liveModelRate } from "../model/rate"
import { recordUsageDebit } from "../usage/record"
import { availableMicros, ensureAccount, holdAutoTopUp } from "./account"
import { debitRun } from "./ledger"

/**
 * Called for every completed model turn: price the tokens at the list
 * rate of the model that answered, debit the organization, and kick off an
 * auto top-up when the balance has sunk below the threshold. In-flight work
 * is never interrupted here; the run budget guard handles new work and the
 * loop's per-turn check the turns after the first.
 */
export async function meterModelUsage(
  ctx: MutationCtx,
  args: {
    model: string
    run: Doc<"runs">
    tokens: { input: number; output: number }
  }
) {
  const micros = priceTokens(await liveModelRate(ctx, args.model), args.tokens)

  if (micros <= 0) {
    return
  }

  const now = Date.now()
  const account = await ensureAccount(ctx, args.run.organizationId)
  const tokens = { input: args.tokens.input, output: args.tokens.output }

  await debitRun(ctx, { account, runId: args.run._id, micros, tokens, now })
  // The ledger stays pure money; attribution is the rollup's business, so
  // the dependency points this way and never back.
  await recordUsageDebit(ctx, {
    run: args.run,
    model: args.model,
    micros,
    tokens,
  })

  const debited = await ctx.db.get(account._id)

  if (debited !== null) {
    await maybeScheduleAutoTopUp(ctx, { account: debited, now })
  }
}

/**
 * The claim is the release time on the charged total: setting it here means
 * one charge attempt owns the window, so parallel debits cannot double-charge.
 * The Stripe edge clears it on success and extends it into a cooldown on
 * decline.
 */
async function maybeScheduleAutoTopUp(
  ctx: MutationCtx,
  args: { account: Doc<"accounts">; now: number }
) {
  const { account, now } = args
  const policy = account.topUp.micros
  const { micros: charged, releaseAt } = account.topUp.charged

  if (
    account.state.kind !== "active" ||
    policy === undefined ||
    account.stripe === undefined
  ) {
    return
  }

  if (availableMicros(account) >= policy.threshold) {
    return
  }

  if (releaseAt !== undefined && releaseAt > now) {
    return
  }

  if (charged + policy.amount > policy.cap) {
    return
  }

  await holdAutoTopUp(ctx, account, now + autoTopUp.claimMs)
  await ctx.scheduler.runAfter(0, internal.billing.stripe.topup.execute, {
    organizationId: account.organizationId,
  })
}
