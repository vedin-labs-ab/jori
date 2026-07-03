import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import {
  type ActionCtx,
  internalQuery,
  type QueryCtx,
} from "../../_generated/server"
import {
  type ReactionSnapshotItem,
  type ReactionSnapshotPlan,
  type ReactionSnapshotTarget,
} from "../../reactions/data"
import { activeSessionIntegration } from "../../sessions/integration"
import { createIntegrationActor } from "../../shared/actor"
import { readRecord } from "../../shared/input"
import { githubJsonArray } from "./api"
import { createGitHubInstallationToken } from "./app"
import { requireGitHubCredentials } from "./credentials"
import { isGitHubSelfActor } from "./data"
import {
  type GitHubReactionSyncTarget,
  githubReactionTarget,
  uniqueGitHubReactionTargets,
} from "./targets"

const defaultTargetLimit = 20
const maxTargetLimit = 50
const reactionsPerTarget = 100
const tokenRefreshBufferMs = 5 * 60 * 1000

const githubReactionLabels: Record<string, string> = {
  "+1": "👍",
  "-1": "👎",
  confused: "😕",
  eyes: "👀",
  heart: "❤️",
  hooray: "🎉",
  laugh: "😄",
  rocket: "🚀",
}

export type GitHubReactionSyncPlan = {
  integration: Doc<"integrations">
  targets: GitHubReactionSyncTarget[]
}

export const sessionTargets = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<GitHubReactionSyncPlan | null> => {
    const linked = await activeSessionIntegration(ctx, {
      sessionId: args.sessionId,
      integration: "github",
    })

    if (linked === null) {
      return null
    }

    const { conversation, integration } = linked

    const messages = await recentConversationMessages(ctx, {
      integration,
      limit: normalizeLimit(args.limit),
      conversation,
    })

    return {
      integration,
      targets: uniqueGitHubReactionTargets(
        messages
          .filter((message) => isGitHubSelfActor(message.actor, integration))
          .map(githubReactionTarget)
      ),
    }
  },
})

export async function githubReactionSnapshots(
  ctx: ActionCtx,
  sessionId: Id<"sessions">
): Promise<ReactionSnapshotPlan | null> {
  const plan = (await ctx.runQuery(
    internal.providers.github.reactions.sessionTargets,
    { sessionId }
  )) as GitHubReactionSyncPlan | null

  if (plan === null || plan.targets.length === 0) {
    return null
  }

  const token = await ensureGitHubReactionToken(ctx, plan.integration)
  const targets: ReactionSnapshotTarget[] = []

  for (const target of plan.targets) {
    targets.push({
      reactions: await fetchGitHubReactionSnapshot(token, target),
      target: target.target,
    })
  }

  return {
    accountId: plan.integration.externalId,
    integration: "github",
    targets,
  }
}

async function ensureGitHubReactionToken(
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

export async function fetchGitHubReactionSnapshot(
  token: string,
  target: GitHubReactionSyncTarget
): Promise<ReactionSnapshotItem[]> {
  const reactions = await githubJsonArray(token, target.path, {
    per_page: reactionsPerTarget,
  })
  const result: ReactionSnapshotItem[] = []

  for (const reaction of reactions) {
    const item = githubReactionSnapshotItem(reaction)

    if (item !== null) {
      result.push(item)
    }
  }

  return result
}

async function recentConversationMessages(
  ctx: QueryCtx,
  args: {
    integration: Doc<"integrations">
    limit: number
    conversation: Doc<"conversations">
  }
) {
  return await ctx.db
    .query("messages")
    .withIndex("by_conversation", (query) =>
      query
        .eq("tenantId", args.conversation.tenantId)
        .eq("integrationId", args.integration._id)
        .eq("conversationId", args.conversation.externalId)
    )
    .order("desc")
    .take(args.limit)
}

function githubReactionSnapshotItem(
  value: unknown
): ReactionSnapshotItem | null {
  const reaction = readRecord(value)
  const id = readNumber(reaction, "id")
  const content = readString(reaction, "content")

  if (id === undefined || content === undefined) {
    return null
  }

  const user = readRecord(reaction.user)

  return {
    reaction: githubReactionLabels[content] ?? content,
    actor: createIntegrationActor({
      externalId: stringValue(readNumber(user, "id")),
      kind: readString(user, "type") === "Bot" ? "bot" : "person",
      name: readString(user, "login"),
    }),
    observedAt: parseTimestamp(readString(reaction, "created_at")),
  }
}

function normalizeLimit(limit: number | undefined) {
  if (limit === undefined || !Number.isFinite(limit)) {
    return defaultTargetLimit
  }

  return Math.min(Math.max(1, Math.trunc(limit)), maxTargetLimit)
}

function readString(data: Record<string, unknown>, key: string) {
  const value = data[key]

  return typeof value === "string" && value !== "" ? value : undefined
}

function readNumber(data: Record<string, unknown>, key: string) {
  const value = data[key]

  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : undefined
}

function stringValue(value: number | undefined) {
  return value === undefined ? undefined : String(value)
}

function parseTimestamp(value: string | undefined) {
  if (value === undefined) {
    return undefined
  }

  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp) ? timestamp : undefined
}
