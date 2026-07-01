import { type Infer, v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { mutation, type QueryCtx, query } from "../../_generated/server"
import { requireWorkerSecret } from "../shared"

const scanLimit = 200
const handoffSubject = v.union(
  v.object({ kind: v.literal("approval"), id: v.id("approvals") }),
  v.object({ kind: v.literal("offer"), id: v.id("integrationOffers") })
)

type HandoffSubject = Infer<typeof handoffSubject>
type ApprovalHandoff = ReturnType<typeof toApprovalHandoff>
type OfferHandoff = ReturnType<typeof toOfferHandoff>

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

export const loadSubjects = query({
  args: {
    secret: v.string(),
    subjects: v.array(handoffSubject),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    requireWorkerSecret(args.secret)

    return await loadSubjectHandoffs(ctx, args.subjects)
  },
})

export const consumeOffer = mutation({
  args: {
    secret: v.string(),
    integrationOfferId: v.id("integrationOffers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const offer = await ctx.db.get(args.integrationOfferId)

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
    .query("integrationOffers")
    .withIndex("by_run_and_status", (query) => query.eq("runId", runId))
    .take(scanLimit)

  return offers.filter(isUnconsumed).map(toOfferHandoff)
}

async function loadSubjectHandoffs(ctx: QueryCtx, subjects: HandoffSubject[]) {
  const approvals: ApprovalHandoff[] = []
  const offers: OfferHandoff[] = []

  for (const subject of subjects) {
    if (subject.kind === "approval") {
      const handoff = toUnconsumedHandoff(
        await ctx.db.get(subject.id),
        toApprovalHandoff
      )

      if (handoff !== null) {
        approvals.push(handoff)
      }
    } else {
      const handoff = toUnconsumedHandoff(
        await ctx.db.get(subject.id),
        toOfferHandoff
      )

      if (handoff !== null) {
        offers.push(handoff)
      }
    }
  }

  return { approvals, offers }
}

function isUnconsumed(record: { consumedAt?: number }) {
  return record.consumedAt === undefined
}

function toUnconsumedHandoff<Source extends { consumedAt?: number }, Handoff>(
  record: Source | null,
  toHandoff: (record: Source) => Handoff
) {
  return record !== null && isUnconsumed(record) ? toHandoff(record) : null
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

function toOfferHandoff(offer: Doc<"integrationOffers">) {
  return {
    id: offer._id,
    integration: offer.integration,
    status: offer.status,
    summary: offer.summary ?? null,
    expiresAt: offer.expiresAt,
  }
}
