import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { mutation, type QueryCtx, query } from "../../_generated/server"
import { requireWorkerSecret } from "../shared"

const scanLimit = 200

export const load = query({
  args: {
    secret: v.string(),
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    requireWorkerSecret(args.secret)

    return {
      approvals: await loadApprovalHandoffs(ctx, args.runId),
      offers: await loadOfferHandoffs(ctx, args.runId),
    }
  },
})

export const consumeApproval = mutation({
  args: {
    secret: v.string(),
    approvalId: v.id("approvals"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const approval = await ctx.db.get(args.approvalId)

    if (approval !== null && approval.consumedAt === undefined) {
      await ctx.db.patch(approval._id, { consumedAt: Date.now() })
    }

    return null
  },
})

export const consumeOffer = mutation({
  args: {
    secret: v.string(),
    setupLinkId: v.id("setupLinks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const offer = await ctx.db.get(args.setupLinkId)

    if (offer !== null && offer.consumedAt === undefined) {
      await ctx.db.patch(offer._id, { consumedAt: Date.now() })
    }

    return null
  },
})

async function loadApprovalHandoffs(ctx: QueryCtx, runId: Id<"runs">) {
  const approvals = await ctx.db
    .query("approvals")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .take(scanLimit)

  return approvals.filter(isUnconsumed).map(toApprovalHandoff)
}

async function loadOfferHandoffs(ctx: QueryCtx, runId: Id<"runs">) {
  const offers = await ctx.db
    .query("setupLinks")
    .withIndex("by_run_and_status", (query) => query.eq("runId", runId))
    .take(scanLimit)

  return offers
    .filter((offer) => offer.awaited === true && isUnconsumed(offer))
    .map(toOfferHandoff)
}

function isUnconsumed(record: { consumedAt?: number }) {
  return record.consumedAt === undefined
}

function toApprovalHandoff(approval: Doc<"approvals">) {
  return {
    id: approval._id,
    status: approval.status,
    surface: approval.surface,
    tool: approval.tool,
    summary: approval.summary,
    code: approval.code,
    expiresAt: approval.expiresAt,
  }
}

function toOfferHandoff(offer: Doc<"setupLinks">) {
  return {
    id: offer._id,
    integration: offer.integration,
    status: offer.status,
    summary: offer.summary ?? null,
    expiresAt: offer.expiresAt,
  }
}
