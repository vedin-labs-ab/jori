import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { githubReactionSnapshots } from "../integrations/github/ingress/reactions"
import { slackReactionSnapshots } from "../integrations/slack/reactions/session"
import { type ReactionSnapshotPlan } from "../reactions/data"
import { type DrainedSessionBatch } from "../sessions/drain"
import { type RuntimeContext } from "./platform/types"

type ReactionSnapshotSource = (
  ctx: ActionCtx,
  sessionId: Id<"sessions">
) => Promise<ReactionSnapshotPlan | null>

const reactionSnapshotSources: ReactionSnapshotSource[] = [
  githubReactionSnapshots,
  slackReactionSnapshots,
]

/** Reactions are synced before the drain reads, so fresh reactions are part
 *  of the batch the model sees. */
export async function drainRunSession(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  runId: Id<"runs">
): Promise<DrainedSessionBatch> {
  await syncSessionReactions(ctx, sessionId)

  return await ctx.runMutation(internal.sessions.drain.messages, {
    sessionId,
    runId,
  })
}

export async function syncSessionReactions(
  ctx: ActionCtx,
  sessionId: Id<"sessions">
) {
  await Promise.all(
    reactionSnapshotSources.map((source) =>
      reconcileSource(ctx, source, sessionId)
    )
  )
}

async function reconcileSource(
  ctx: ActionCtx,
  source: ReactionSnapshotSource,
  sessionId: Id<"sessions">
) {
  try {
    const plan = await source(ctx, sessionId)

    if (plan === null) {
      return
    }

    for (const { reactions, target } of plan.targets) {
      await ctx.runMutation(internal.reactions.intake.sync, {
        accountId: plan.accountId,
        integration: plan.integration,
        reactions,
        target,
      })
    }
  } catch {
    // Reaction context is supplemental; message draining should continue.
  }
}

export async function retargetRunSession(
  ctx: ActionCtx,
  context: RuntimeContext,
  target: string
) {
  if (context.session !== null) {
    await ctx.runMutation(internal.sessions.data.retarget, {
      runId: context.run.id,
      sessionId: context.session.id,
      target,
    })
  }
}
