import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { internalMutation, internalQuery } from "../../_generated/server"
import { getAccount } from "../account"
import { requireCreditedPurchase } from "./purchase"
import { reservation } from "./schema"
import { heldAccount, requireSettled, validateReservation } from "./validation"

/** Internal functions require Convex deployment credentials, never a customer JWT. */
export const freeze = internalMutation({
  args: { organizationId: v.string(), caseId: v.string() },
  handler: async (ctx, args) => {
    if (!args.caseId.trim() || args.caseId.length > 200) {
      throw new Error("A short support case ID is required.")
    }
    const account = await getAccount(ctx, args.organizationId)
    if (account === null) {
      throw new Error("Billing account not found.")
    }
    if (
      account.refundHold !== undefined &&
      account.refundHold !== args.caseId
    ) {
      throw new Error("Another refund case holds this account.")
    }
    await ctx.db.patch(account._id, {
      refundHold: args.caseId,
      refundHeldAt: account.refundHeldAt ?? Date.now(),
      topUp: { charged: account.topUp.charged },
      updatedAt: Date.now(),
    })
    return {
      customerId: account.stripe?.customerId,
      subscriptionId: account.stripe?.subscriptionId,
      micros: account.micros,
    }
  },
})

export const inspect = internalQuery({
  args: { organizationId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => ({
    account: await getAccount(ctx, args.organizationId),
    ledger: await ctx.db
      .query("transactions")
      .withIndex("by_organization_and_timestamp", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("asc")
      .paginate(args.paginationOpts),
    cancellations: await ctx.db
      .query("billingCancellations")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(100),
    refunds: await ctx.db
      .query("billingRefunds")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .take(100),
  }),
})

export const read = internalQuery({
  args: { caseId: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query("billingRefunds")
      .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
      .unique(),
})

export const reserve = internalMutation({
  args: {
    ...reservation,
    customerId: v.string(),
    priorRefundedMinor: v.number(),
    creditSourceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateReservation(args)
    const existing = await ctx.db
      .query("billingRefunds")
      .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
      .unique()
    if (existing !== null) {
      if (existing.status === "released") {
        throw new Error("A released case cannot be reused. Start a new case.")
      }
      for (const key of Object.keys(args) as (keyof typeof args)[]) {
        if (existing[key] !== args[key]) {
          throw new Error("Case ID belongs to a different refund calculation.")
        }
      }
      return existing._id
    }
    const account = await heldAccount(ctx, args.organizationId, args.caseId)
    await requireSettled(ctx, account)
    await requireCreditedPurchase(ctx, args)
    if (account.stripe?.customerId !== args.customerId) {
      throw new Error("Stripe customer does not match this workspace.")
    }
    const allowance = account.micros.allowance - args.allowanceMicros
    const wallet = account.micros.wallet - args.walletMicros
    if (allowance < 0 || wallet < 0) {
      throw new Error("The reserved credits exceed the current balance.")
    }
    const id = await ctx.db.insert("billingRefunds", {
      ...args,
      status: "reserved",
      createdAt: Date.now(),
    })
    await ctx.db.patch(account._id, {
      micros: { allowance, wallet },
      updatedAt: Date.now(),
    })
    return id
  },
})

export const settle = internalMutation({
  args: { caseId: v.string(), refundId: v.string() },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("billingRefunds")
      .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
      .unique()
    if (entry === null || entry.status === "released") {
      throw new Error("No reserved refund for this case.")
    }
    if (entry.status === "refunded") {
      if (entry.refundId !== args.refundId) {
        throw new Error("Case already settled with another refund.")
      }
      return entry._id
    }
    const duplicate = await ctx.db
      .query("billingRefunds")
      .withIndex("by_refundId", (q) => q.eq("refundId", args.refundId))
      .unique()
    if (duplicate !== null) {
      throw new Error("This Stripe refund already settled another case.")
    }
    await heldAccount(ctx, entry.organizationId, args.caseId)
    await ctx.db.patch(entry._id, {
      status: "refunded",
      refundId: args.refundId,
      resolvedAt: Date.now(),
    })
    return entry._id
  },
})

/** Called only after the action checks Stripe for completed or pending refunds. */
export const release = internalMutation({
  args: { organizationId: v.string(), caseId: v.string() },
  handler: async (ctx, args) => {
    const account = await heldAccount(ctx, args.organizationId, args.caseId)
    const entry = await ctx.db
      .query("billingRefunds")
      .withIndex("by_caseId", (q) => q.eq("caseId", args.caseId))
      .unique()
    if (entry?.status === "reserved") {
      const allowance = account.micros.allowance + entry.allowanceMicros
      const wallet = account.micros.wallet + entry.walletMicros
      if (!Number.isSafeInteger(allowance) || !Number.isSafeInteger(wallet)) {
        throw new Error("Unsafe restored balance.")
      }
      await ctx.db.patch(account._id, { micros: { allowance, wallet } })
      await ctx.db.patch(entry._id, {
        status: "released",
        resolvedAt: Date.now(),
      })
    }
    await ctx.db.patch(account._id, {
      refundHold: undefined,
      refundHeldAt: undefined,
      updatedAt: Date.now(),
    })
    return null
  },
})
