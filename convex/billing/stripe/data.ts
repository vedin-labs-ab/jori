import { v } from "convex/values"
import { internalMutation, internalQuery } from "../../_generated/server"
import { ensureAccount, getAccount, holdAutoTopUp } from "../account"

export const read = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => await getAccount(ctx, args.organizationId),
})

export const ensure = internalMutation({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => await ensureAccount(ctx, args.organizationId),
})

export const attachCustomer = internalMutation({
  args: { organizationId: v.string(), customerId: v.string() },
  handler: async (ctx, args) => {
    const account = await ensureAccount(ctx, args.organizationId)

    await ctx.db.patch(account._id, {
      stripe: { ...account.stripe, customerId: args.customerId },
      updatedAt: Date.now(),
    })

    return null
  },
})

/** Pushes the auto-top-up claim into a cooldown after a failed attempt so a
 *  declining card is retried hours apart, not on every debit. */
export const cooldown = internalMutation({
  args: { organizationId: v.string(), cooldownMs: v.number() },
  handler: async (ctx, args) => {
    const account = await getAccount(ctx, args.organizationId)

    if (account !== null) {
      await holdAutoTopUp(ctx, account, Date.now() + args.cooldownMs)
    }

    return null
  },
})
