import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx, action, mutation } from "../_generated/server"
import { githubReactionSnapshots } from "../providers/github/reactions"
import { slackReactionSnapshots } from "../providers/slack/reactions/session"
import { type ReactionSnapshotPlan } from "../reactions/data"
import { requireWorkerSecret } from "./shared"

type ReactionSyncStatus = "failed" | "skipped" | "synced"

type ReactionSyncResult = {
  recorded: number
  status: ReactionSyncStatus
  targets: number
}

type ReactionSnapshotSource = (
  ctx: ActionCtx,
  sessionId: Id<"sessions">
) => Promise<ReactionSnapshotPlan | null>

const reactionSnapshotSources: ReactionSnapshotSource[] = [
  githubReactionSnapshots,
  slackReactionSnapshots,
]

export const drain = mutation({
  args: {
    limit: v.optional(v.number()),
    secret: v.string(),
    sessionId: v.id("sessions"),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    requireWorkerSecret(args.secret)

    return await ctx.runMutation(internal.sessions.data.drainMessages, {
      limit: args.limit,
      sessionId: args.sessionId,
    })
  },
})

export const syncReactions = action({
  args: {
    secret: v.string(),
    sessionId: v.id("sessions"),
  },
  returns: v.object({
    recorded: v.number(),
    status: v.union(
      v.literal("failed"),
      v.literal("skipped"),
      v.literal("synced")
    ),
    targets: v.number(),
  }),
  handler: async (ctx, args): Promise<ReactionSyncResult> => {
    requireWorkerSecret(args.secret)

    return await syncSessionReactions(ctx, args.sessionId)
  },
})

export async function syncSessionReactions(
  ctx: ActionCtx,
  sessionId: Id<"sessions">
): Promise<ReactionSyncResult> {
  const results = await Promise.all(
    reactionSnapshotSources.map((source) =>
      reconcileSource(ctx, source, sessionId)
    )
  )

  return results.reduce(mergeReactionSync, {
    recorded: 0,
    status: "skipped",
    targets: 0,
  })
}

async function reconcileSource(
  ctx: ActionCtx,
  source: ReactionSnapshotSource,
  sessionId: Id<"sessions">
): Promise<ReactionSyncResult> {
  try {
    const plan = await source(ctx, sessionId)

    if (plan === null || plan.targets.length === 0) {
      return { recorded: 0, status: "skipped", targets: 0 }
    }

    return await reconcilePlan(ctx, plan)
  } catch {
    // Reaction context is supplemental; message draining should continue.
    return { recorded: 0, status: "failed", targets: 0 }
  }
}

async function reconcilePlan(
  ctx: ActionCtx,
  plan: ReactionSnapshotPlan
): Promise<ReactionSyncResult> {
  let recorded = 0
  let targets = 0

  for (const { reactions, target } of plan.targets) {
    const result = (await ctx.runMutation(internal.reactions.intake.sync, {
      accountId: plan.accountId,
      integration: plan.integration,
      reactions,
      target,
    })) as { recorded?: number; status: string }

    if (result.status === "synced") {
      recorded += result.recorded ?? 0
      targets += 1
    }
  }

  return { recorded, status: "synced", targets }
}

function mergeReactionSync(
  left: ReactionSyncResult,
  right: ReactionSyncResult
): ReactionSyncResult {
  return {
    recorded: left.recorded + right.recorded,
    status: combineReactionSyncStatus(left.status, right.status),
    targets: left.targets + right.targets,
  }
}

function combineReactionSyncStatus(
  left: ReactionSyncStatus,
  right: ReactionSyncStatus
): ReactionSyncStatus {
  if (left === "synced" || right === "synced") {
    return "synced"
  }

  if (left === "failed" || right === "failed") {
    return "failed"
  }

  return "skipped"
}
