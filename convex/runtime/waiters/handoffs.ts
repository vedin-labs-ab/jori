import { v } from "convex/values"
import { mutation, query } from "../../_generated/server"
import {
  consumeApprovalHandoff,
  consumeOfferHandoff,
  handoffSubject,
  loadRunHandoffs,
  loadSubjectHandoffs,
} from "../../runs/execution/waiters/handoffs"
import { requireWorkerSecret } from "../secret"

export const load = query({
  args: {
    secret: v.string(),
    runId: v.id("runs"),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    requireWorkerSecret(args.secret)

    return await loadRunHandoffs(ctx, args.runId)
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

    return await consumeApprovalHandoff(ctx, args.approvalId)
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

    return await consumeOfferHandoff(ctx, args.integrationOfferId)
  },
})
