import { plans } from "../../contracts/billing"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { resetAllowance } from "./ledger"

const batchSize = 32

/**
 * Advances a billing anchor by whole months, keeping the anchor day and
 * clamping to shorter months (a Jan 31 anchor renews on Feb 28).
 */
export function addMonths(timestamp: number, months: number) {
  const date = new Date(timestamp)
  const target = new Date(timestamp)

  target.setUTCDate(1)
  target.setUTCMonth(target.getUTCMonth() + months)

  const daysInMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate()

  target.setUTCDate(Math.min(date.getUTCDate(), daysInMonth))

  return target.getTime()
}

/**
 * Hourly heartbeat that refreshes the monthly allowance on each account's
 * billing anchor. Allowances are cron-driven rather than webhook-driven so
 * annual plans still refresh monthly and a missed webhook cannot skip a cycle;
 * unpaid accounts are paused by the Stripe edge, which clears their anchor.
 */
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const due = await ctx.db
      .query("accounts")
      .withIndex("by_renewal", (query) =>
        query.gt("renewsAt", 0).lte("renewsAt", now)
      )
      .take(batchSize)

    for (const account of due) {
      await refreshCycle(ctx, account, now)
    }

    if (due.length === batchSize) {
      await ctx.scheduler.runAfter(0, internal.billing.cycle.sweep, {})
    }
  },
})

async function refreshCycle(
  ctx: MutationCtx,
  account: Doc<"accounts">,
  now: number
) {
  const { state, renewsAt } = account

  // Only an active plan renews; a paused subscription that still carries an
  // anchor loses it here rather than earning another allowance.
  if (state.kind !== "active" || renewsAt === undefined) {
    await ctx.db.patch(account._id, { renewsAt: undefined })

    return
  }

  await resetAllowance(ctx, {
    account,
    micros: plans[state.plan].monthlyAllowanceMicros,
    source: "cycle",
    now,
  })

  let nextRenewsAt = renewsAt

  while (nextRenewsAt <= now) {
    nextRenewsAt = addMonths(nextRenewsAt, 1)
  }

  await ctx.db.patch(account._id, { renewsAt: nextRenewsAt })
}
