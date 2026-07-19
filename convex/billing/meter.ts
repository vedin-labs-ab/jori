import { agentModel, autoTopUp, priceModelUsage } from "../../contracts/billing"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { availableMicros, ensureAccount, holdAutoTopUp } from "./account"
import { debitRun } from "./ledger"

/**
 * Called for every completed model turn: price the tokens at list rates,
 * debit the tenant, and kick off an auto top-up when the balance has sunk
 * below the threshold. In-flight work is never interrupted here; the run
 * budget guard handles new work.
 */
export async function meterModelUsage(
  ctx: MutationCtx,
  args: {
    run: Doc<"runs">
    usage: { inputTokens: number; outputTokens: number }
  }
) {
  const micros = priceModelUsage(agentModel, args.usage)

  if (micros <= 0) {
    return
  }

  const now = Date.now()
  const account = await ensureAccount(ctx, args.run.tenantId)

  await debitRun(ctx, { account, runId: args.run._id, micros, now })

  const debited = await ctx.db.get(account._id)

  if (debited !== null) {
    await maybeScheduleAutoTopUp(ctx, { account: debited, now })
  }
}

/**
 * The hold field is the claim: setting it here means one charge attempt owns
 * the window, so parallel debits cannot double-charge. The Stripe edge clears
 * it on success and extends it into a cooldown on decline.
 */
async function maybeScheduleAutoTopUp(
  ctx: MutationCtx,
  args: { account: Doc<"billingAccounts">; now: number }
) {
  const { account, now } = args
  const config = account.autoTopUp

  if (config === undefined || account.stripeCustomerId === undefined) {
    return
  }

  if (availableMicros(account) >= autoTopUp.thresholdMicros) {
    return
  }

  if (
    account.autoTopUpHoldUntil !== undefined &&
    account.autoTopUpHoldUntil > now
  ) {
    return
  }

  if (
    account.autoTopUpUsedMicros + config.amountMicros >
    config.monthlyCapMicros
  ) {
    return
  }

  await holdAutoTopUp(ctx, account, now + autoTopUp.claimMs)
  await ctx.scheduler.runAfter(0, internal.billing.stripe.topup.execute, {
    tenantId: account.tenantId,
  })
}
