import { v } from "convex/values"
import { approvalTtlMs } from "../../contracts/approvals"
import { isTerminalRunStatus } from "../../contracts/runtime/runs"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { actorValidator } from "../shared/actor"
import {
  slackMessageDeliveryValidator,
  toolSurfaceValidator,
} from "../shared/integrations"
import { resolveApprovalActor } from "./actors"
import { resolveCancellationActor } from "./cancellation"
import { approvalDecision, approvalDeliveryFailure } from "./schema"
import {
  markApprovalCancelled,
  markApprovalDecided,
  markApprovalExpired,
  markApprovalFailed,
  patchAndRead,
  recordApprovalCreated,
  recordApprovalDelivery,
} from "./transition"

export const create = internalMutation({
  args: {
    organizationId: v.string(),
    runId: v.id("runs"),
    surface: toolSurfaceValidator,
    tool: v.string(),
    inputJson: v.string(),
    summary: v.string(),
    code: v.string(),
    requestedBy: actorValidator,
  },
  handler: async (ctx, args) => {
    await resolveApprovalActor(ctx, {
      actor: args.requestedBy,
      surface: args.surface,
      organizationId: args.organizationId,
    })
    const reusable = await findReusableApproval(ctx, args)

    if (reusable !== null) {
      return {
        approvalId: reusable._id,
        code: reusable.code,
        expiresAt: reusable.expiresAt,
        reused: true,
      }
    }

    const now = Date.now()
    const expiresAt = now + approvalTtlMs
    const approvalId = await ctx.db.insert("approvals", {
      organizationId: args.organizationId,
      runId: args.runId,
      surface: args.surface,
      tool: args.tool,
      args: args.inputJson,
      summary: args.summary,
      code: args.code,
      status: "pending",
      requestedBy: args.requestedBy,
      createdAt: now,
      expiresAt,
    })
    const functionId = await ctx.scheduler.runAt(
      expiresAt,
      internal.approvals.runtime.expireApproval,
      { approvalId }
    )
    const approval = await patchAndRead(ctx, approvalId, { functionId })

    if (approval !== null) {
      await recordApprovalCreated(ctx, approval)
    }

    return { approvalId, code: args.code, expiresAt, reused: false }
  },
})

export const recordDelivery = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    delivery: slackMessageDeliveryValidator,
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (approval !== null) {
      await recordApprovalDelivery(ctx, approval, args.delivery)
    }

    return null
  },
})

export const recordDeliveryFailure = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    failure: approvalDeliveryFailure,
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (approval !== null) {
      await markApprovalFailed(ctx, approval, args.failure)
    }

    return null
  },
})

export const decide = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    decidedBy: actorValidator,
    decision: approvalDecision,
    expectedConnection: v.optional(
      v.object({ integrationId: v.id("integrations"), generation: v.number() })
    ),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (approval === null) {
      return { status: "missing" as const }
    }

    if (args.expectedConnection !== undefined) {
      const integration = await ctx.db.get(
        args.expectedConnection.integrationId
      )
      if (
        integration === null ||
        integration.status !== "active" ||
        integration.organizationId !== approval.organizationId ||
        (integration.connectionGeneration ?? 0) !==
          args.expectedConnection.generation
      ) {
        return { status: "missing" as const }
      }
    }

    if (approval.status !== "pending") {
      return { status: settledStatus(approval), approval }
    }

    if (Date.now() >= approval.expiresAt) {
      const updated = await markApprovalExpired(ctx, approval)

      return { status: "expired" as const, approval: updated ?? approval }
    }

    const run = await ctx.db.get(approval.runId)

    if (run === null || isTerminalRunStatus(run.status)) {
      return { status: "closed" as const, approval }
    }

    await resolveApprovalActor(ctx, {
      actor: args.decidedBy,
      surface: approval.surface,
      organizationId: approval.organizationId,
    })
    const updated = await markApprovalDecided(ctx, approval, {
      decidedBy: args.decidedBy,
      decision: args.decision,
      now: Date.now(),
    })

    return {
      status: args.decision,
      approval: updated ?? approval,
    }
  },
})

export const cancel = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    messageId: v.id("messages"),
    runId: v.id("runs"),
    organizationId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (
      approval === null ||
      approval.runId !== args.runId ||
      approval.organizationId !== args.organizationId
    ) {
      return { status: "missing" as const }
    }

    if (approval.status !== "pending") {
      return { status: settledStatus(approval), approval }
    }

    const cancelledBy = await resolveCancellationActor(ctx, {
      messageId: args.messageId,
      runId: args.runId,
      organizationId: args.organizationId,
    })

    if (cancelledBy === null) {
      return { status: "invalid_message" as const, approval }
    }

    await resolveApprovalActor(ctx, {
      actor: cancelledBy,
      surface: approval.surface,
      organizationId: approval.organizationId,
    })
    const updated = await markApprovalCancelled(ctx, approval, {
      cancelledBy,
      now: Date.now(),
      reason: args.reason,
    })

    return { status: "cancelled" as const, approval: updated ?? approval }
  },
})

export const expire = internalMutation({
  args: {
    approvalId: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId)

    if (
      approval === null ||
      approval.status !== "pending" ||
      Date.now() < approval.expiresAt
    ) {
      return null
    }

    const updated = await markApprovalExpired(ctx, approval)

    return updated ?? approval
  },
})

async function findReusableApproval(
  ctx: MutationCtx,
  args: { runId: Doc<"runs">["_id"]; tool: string; inputJson: string }
) {
  const pending = ctx.db
    .query("approvals")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", args.runId).eq("status", "pending")
    )

  for await (const approval of pending) {
    if (approval.tool === args.tool && approval.args === args.inputJson) {
      return approval
    }
  }

  return null
}

function settledStatus(approval: Doc<"approvals">) {
  if (approval.status === "expired" || approval.status === "failed") {
    return approval.status
  }

  return "decided" as const
}
