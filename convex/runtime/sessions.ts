import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx, action, mutation } from "../_generated/server"
import { createGitHubInstallationToken } from "../providers/github/app"
import { requireGitHubCredentials } from "../providers/github/credentials"
import {
  fetchGitHubReactionSnapshot,
  type GitHubReactionSyncPlan,
} from "../providers/github/reactions"
import { type GitHubReactionSyncTarget } from "../providers/github/targets"
import { requireSlackCredentials } from "../providers/slack/credentials"
import { type SlackReactionSyncPlan } from "../providers/slack/reactions/session"
import { fetchSlackReactionSnapshots } from "../providers/slack/reactions/snapshot"
import { requireWorkerSecret } from "./shared"

const tokenRefreshBufferMs = 5 * 60 * 1000

type ReactionSyncResult = {
  recorded: number
  status: "failed" | "skipped" | "synced"
  targets: number
}

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
  sessionId: Doc<"sessions">["_id"]
): Promise<ReactionSyncResult> {
  try {
    const [github, slack] = await Promise.all([
      syncGitHubSessionReactions(ctx, sessionId),
      syncSlackSessionReactions(ctx, sessionId),
    ])

    return {
      recorded: github.recorded + slack.recorded,
      status:
        github.status === "failed" && slack.status === "failed"
          ? "failed"
          : github.status === "skipped" && slack.status === "skipped"
            ? "skipped"
            : "synced",
      targets: github.targets + slack.targets,
    }
  } catch {
    return { recorded: 0, status: "failed", targets: 0 }
  }
}

async function syncGitHubSessionReactions(
  ctx: ActionCtx,
  sessionId: Doc<"sessions">["_id"]
): Promise<ReactionSyncResult> {
  const plan = (await ctx.runQuery(
    internal.providers.github.reactions.sessionTargets,
    { sessionId }
  )) as GitHubReactionSyncPlan | null

  if (plan === null || plan.targets.length === 0) {
    return { recorded: 0, status: "skipped", targets: 0 }
  }

  const token = await gitHubSyncToken(ctx, plan.integration)

  if (token === undefined) {
    return { recorded: 0, status: "failed", targets: 0 }
  }

  return await syncGitHubReactionTargets(ctx, {
    accountId: plan.integration.externalId,
    targets: plan.targets,
    token,
  })
}

async function syncSlackSessionReactions(
  ctx: ActionCtx,
  sessionId: Doc<"sessions">["_id"]
): Promise<ReactionSyncResult> {
  const plan = (await ctx.runQuery(
    internal.providers.slack.reactions.session.sessionTarget,
    { sessionId }
  )) as SlackReactionSyncPlan | null

  if (plan === null) {
    return { recorded: 0, status: "skipped", targets: 0 }
  }

  return await syncSlackReactionTargets(ctx, {
    accountId: plan.integration.externalId,
    snapshots: await fetchSlackReactionSnapshots(
      requireSlackCredentials(plan.integration).user,
      plan
    ),
  })
}

async function gitHubSyncToken(
  ctx: ActionCtx,
  integration: Doc<"integrations">
) {
  const credentials = requireGitHubCredentials(integration)
  const accessToken = credentials.tokens?.access

  if (
    accessToken !== undefined &&
    credentials.expiresAt !== undefined &&
    credentials.expiresAt > Date.now() + tokenRefreshBufferMs
  ) {
    return accessToken
  }

  const tokenResult = await createGitHubInstallationToken(
    credentials.installationId
  )
  const expiresAt = Date.parse(tokenResult.expires_at)

  if (Number.isFinite(expiresAt)) {
    await ctx.runMutation(
      internal.providers.github.install.updateInstallationCredentials,
      {
        accessToken: tokenResult.token,
        expiresAt,
        integrationId: integration._id,
      }
    )
  }

  return tokenResult.token
}

async function syncGitHubReactionTargets(
  ctx: ActionCtx,
  args: {
    accountId: string
    targets: GitHubReactionSyncTarget[]
    token: string
  }
) {
  let recorded = 0
  let targets = 0

  for (const target of args.targets) {
    try {
      const result = (await ctx.runMutation(internal.reactions.intake.sync, {
        accountId: args.accountId,
        integration: "github",
        reactions: await fetchGitHubReactionSnapshot(args.token, target),
        target: target.target,
      })) as { recorded?: number; status: string }

      if (result.status === "synced") {
        recorded += result.recorded ?? 0
        targets += 1
      }
    } catch {
      // Reaction context is supplemental; message draining should continue.
    }
  }

  return { recorded, status: "synced" as const, targets }
}

async function syncSlackReactionTargets(
  ctx: ActionCtx,
  args: {
    accountId: string
    snapshots: Awaited<ReturnType<typeof fetchSlackReactionSnapshots>>
  }
) {
  let recorded = 0
  let targets = 0

  for (const snapshot of args.snapshots) {
    try {
      const result = (await ctx.runMutation(internal.reactions.intake.sync, {
        accountId: args.accountId,
        integration: "slack",
        reactions: snapshot.reactions,
        target: snapshot.target,
      })) as { recorded?: number; status: string }

      if (result.status === "synced") {
        recorded += result.recorded ?? 0
        targets += 1
      }
    } catch {
      // Reaction context is supplemental; message draining should continue.
    }
  }

  return { recorded, status: "synced" as const, targets }
}
