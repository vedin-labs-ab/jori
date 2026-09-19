import { v } from "convex/values"
import { internalMutation } from "../../../_generated/server"
import { assertWorkspaceAvailable } from "../../../retention/access"
import {
  getAccount,
  requireActivePlan,
  requireNoRefundHold,
} from "../../account"
import { checkoutReservation } from "../../schema"

const kind = v.union(v.literal("plan"), v.literal("storage"))
const identity = { organizationId: v.string(), kind, attempt: v.string() }

/** OCC gives each organization and recurring purchase one provider POST. */
export const reserve = internalMutation({
  args: {
    ...identity,
    productId: v.string(),
    replaces: v.optional(v.string()),
  },
  returns: checkoutReservation,
  handler: async (ctx, args) => {
    await assertWorkspaceAvailable(ctx, args.organizationId)
    const account = await getAccount(ctx, args.organizationId)
    if (account === null) {
      throw new Error("Billing account not found.")
    }
    requireNoRefundHold(account)
    if (args.kind === "storage") {
      requireActivePlan(account)
    }
    if (
      args.kind === "plan"
        ? account.polar?.subscriptionId !== undefined
        : account.storage !== undefined
    ) {
      throw new Error(
        "This subscription already exists. Use Manage billing to change it."
      )
    }
    const existing = account.checkouts?.[args.kind]
    if (existing !== undefined && existing.attempt !== args.replaces) {
      return existing
    }
    if (args.replaces !== undefined && existing === undefined) {
      throw new Error("Checkout changed. Please try again.")
    }
    const reservation = {
      attempt: args.attempt,
      productId: args.productId,
      started: false,
    }
    await ctx.db.patch(account._id, {
      checkouts: { ...account.checkouts, [args.kind]: reservation },
    })
    return reservation
  },
})

/** No clock-based release: a delayed POST may still create a payable checkout. */
export const start = internalMutation({
  args: identity,
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await assertWorkspaceAvailable(ctx, args.organizationId)
    const account = await getAccount(ctx, args.organizationId)
    if (account === null) {
      return false
    }
    requireNoRefundHold(account)
    if (args.kind === "storage") {
      requireActivePlan(account)
    }
    if (
      args.kind === "plan"
        ? account.polar?.subscriptionId !== undefined
        : account.storage !== undefined
    ) {
      return false
    }
    const reservation = account.checkouts?.[args.kind]
    if (
      reservation?.attempt !== args.attempt ||
      reservation.started ||
      reservation.checkoutId !== undefined
    ) {
      return false
    }
    await ctx.db.patch(account._id, {
      checkouts: {
        ...account.checkouts,
        [args.kind]: { ...reservation, started: true },
      },
    })
    return true
  },
})

export const attach = internalMutation({
  args: { ...identity, checkoutId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const account = await getAccount(ctx, args.organizationId)
    const reservation = account?.checkouts?.[args.kind]
    if (
      account === null ||
      reservation?.attempt !== args.attempt ||
      (reservation.checkoutId !== undefined &&
        reservation.checkoutId !== args.checkoutId)
    ) {
      throw new Error("Checkout changed. Please try again.")
    }
    await ctx.db.patch(account._id, {
      checkouts: {
        ...account.checkouts,
        [args.kind]: { ...reservation, checkoutId: args.checkoutId },
      },
    })
    return null
  },
})
