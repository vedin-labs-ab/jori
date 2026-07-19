import { v } from "convex/values"
import { internalMutation, internalQuery } from "../../_generated/server"
import { ensureAccount, getAccount, holdAutoTopUp } from "../account"

export const read = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => await getAccount(ctx, args.tenantId),
})

export const ensure = internalMutation({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => await ensureAccount(ctx, args.tenantId),
})

export const attachCustomer = internalMutation({
  args: { tenantId: v.string(), stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const account = await ensureAccount(ctx, args.tenantId)

    await ctx.db.patch(account._id, {
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now(),
    })

    return null
  },
})

/** Pushes the auto-top-up claim into a cooldown after a failed attempt so a
 *  declining card is retried hours apart, not on every debit. */
export const cooldown = internalMutation({
  args: { tenantId: v.string(), cooldownMs: v.number() },
  handler: async (ctx, args) => {
    const account = await getAccount(ctx, args.tenantId)

    if (account !== null) {
      await holdAutoTopUp(ctx, account, Date.now() + args.cooldownMs)
    }

    return null
  },
})
