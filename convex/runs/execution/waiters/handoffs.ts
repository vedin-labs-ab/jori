import { v } from "convex/values"
import {
  type ApprovalHandoff,
  type HandoffSubject,
  type OfferHandoff,
  type RunHandoffs,
} from "../../../../contracts/runtime/worker"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../../../_generated/server"

const scanLimit = 200
export const handoffSubject = v.union(
  v.object({ kind: v.literal("approval"), id: v.id("approvals") }),
  v.object({ kind: v.literal("offer"), id: v.id("integrationOffers") })
)

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
  approvalId: Id<"approvals">
) {
  const approval = await ctx.db.get(approvalId)

  if (approval !== null && approval.consumedAt === undefined) {
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

export async function loadSubjectHandoffs(
  ctx: QueryCtx,
  subjects: HandoffSubject[]
): Promise<RunHandoffs> {
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

function toApprovalHandoff(approval: Doc<"approvals">): ApprovalHandoff {
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

function toOfferHandoff(offer: Doc<"integrationOffers">): OfferHandoff {
  return {
    id: offer._id,
    integration: offer.integration,
    status: offer.status,
    summary: offer.summary ?? null,
    expiresAt: offer.expiresAt,
  }
}
