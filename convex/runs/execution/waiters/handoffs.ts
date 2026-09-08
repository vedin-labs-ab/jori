import { v } from "convex/values"
import {
  approvalExecutionTimeoutMs,
  type RunHandoffs,
} from "../../../../contracts/runtime/handoffs"
import { type Doc, type Id } from "../../../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../../../_generated/server"
import { appendTranscript } from "../transcript/data"
import { type TranscriptMessage, transcriptMessage } from "../transcript/schema"

const scanLimit = 200

export const load = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<RunHandoffs> => {
    return await loadRunHandoffs(ctx, args.runId)
  },
})

export const consumeApproval = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    message: v.optional(transcriptMessage),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await consumeApprovalHandoff(ctx, args.approvalId, args.message)
  },
})

export const consumeOffer = internalMutation({
  args: {
    integrationOfferId: v.id("integrationOffers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await consumeOfferHandoff(ctx, args.integrationOfferId)
  },
})

export async function loadRunHandoffs(
  ctx: QueryCtx,
  runId: Id<"runs">
): Promise<RunHandoffs> {
  return {
    approvals: await loadApprovalHandoffs(ctx, runId),
    offers: await loadOfferHandoffs(ctx, runId),
  }
}

export async function consumeApprovalHandoff(
  ctx: MutationCtx,
  approvalId: Id<"approvals">,
  message?: TranscriptMessage
) {
  const approval = await ctx.db.get(approvalId)

  if (approval !== null && approval.consumedAt === undefined) {
    if (message !== undefined) {
      await appendTranscript(ctx, approval.runId, [message])
    }

    await ctx.db.patch(approval._id, { consumedAt: Date.now() })
  }

  return null
}

export async function consumeOfferHandoff(
  ctx: MutationCtx,
  integrationOfferId: Id<"integrationOffers">
) {
  const offer = await ctx.db.get(integrationOfferId)

  if (offer !== null && offer.consumedAt === undefined) {
    await ctx.db.patch(offer._id, { consumedAt: Date.now() })
  }

  return null
}

async function loadApprovalHandoffs(ctx: QueryCtx, runId: Id<"runs">) {
  const approvals = await ctx.db
    .query("approvals")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .take(scanLimit)

  return approvals.filter(isUnconsumed).map(toApprovalHandoff)
}

async function loadOfferHandoffs(ctx: QueryCtx, runId: Id<"runs">) {
  const offers = await ctx.db
    .query("integrationOffers")
    .withIndex("by_run_and_status", (query) => query.eq("runId", runId))
    .take(scanLimit)

  return offers.filter(isUnconsumed).map(toOfferHandoff)
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
    ...(approval.claimedAt === undefined || approval.result !== undefined
      ? {}
      : {
          executionPendingUntil:
            approval.claimedAt + approvalExecutionTimeoutMs,
        }),
  }
}

function toOfferHandoff(offer: Doc<"integrationOffers">) {
  return {
    id: offer._id,
    integration: offer.integration,
    status: offer.status,
    summary: offer.summary ?? null,
    expiresAt: offer.expiresAt,
  }
}
