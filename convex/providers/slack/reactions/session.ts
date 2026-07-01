import { v } from "convex/values"
import { internal } from "../../../_generated/api"
import { type Doc, type Id } from "../../../_generated/dataModel"
import {
  type ActionCtx,
  internalQuery,
  type QueryCtx,
} from "../../../_generated/server"
import {
  type ReactionSnapshotItem,
  type ReactionSnapshotPlan,
  type ReactionSnapshotTarget,
} from "../../../reactions/data"
import {
  type Actor,
  type ActorAlias,
  type ActorKind,
  createIntegrationActor,
  getActorExternalId,
} from "../../../shared/actor"
import { requireSlackCredentials } from "../credentials"
import { getSlackChannelId } from "../data"
import {
  getSlackActorProfile,
  type SlackActorProfile,
} from "../directory/users"
import { fetchSlackReactionSnapshots } from "./snapshot"

export type SlackReactionSyncPlan = {
  channelId: string
  integration: Doc<"integrations">
  threadTs: string
}

export async function slackReactionSnapshots(
  ctx: ActionCtx,
  sessionId: Id<"sessions">
): Promise<ReactionSnapshotPlan | null> {
  const plan = (await ctx.runQuery(
    internal.providers.slack.reactions.session.sessionTarget,
    { sessionId }
  )) as SlackReactionSyncPlan | null

  if (plan === null) {
    return null
  }

  const targets = await fetchSlackReactionSnapshots(
    requireSlackCredentials(plan.integration).user,
    plan
  )

  return {
    accountId: plan.integration.externalId,
    integration: "slack",
    targets: applySlackReactionProfiles(
      targets,
      await slackReactionActorProfiles(
        ctx,
        plan.integration.externalId,
        targets
      )
    ),
  }
}

export function applySlackReactionProfiles(
  targets: ReactionSnapshotTarget[],
  profiles: ReadonlyMap<string, SlackActorProfile>
): ReactionSnapshotTarget[] {
  return targets.map((target) => ({
    ...target,
    reactions: target.reactions.map((reaction) =>
      applySlackReactionProfile(reaction, profiles)
    ),
  }))
}

export const sessionTarget = internalQuery({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<SlackReactionSyncPlan | null> => {
    const session = await ctx.db.get(args.sessionId)

    if (session?.runId === undefined) {
      return null
    }

    if (session.conversationId === undefined) {
      return null
    }

    const conversation = await ctx.db.get(session.conversationId)

    if (conversation === null) {
      return null
    }

    const integration = await ctx.db.get(conversation.integrationId)

    if (
      integration?.integration !== "slack" ||
      integration.status !== "active"
    ) {
      return null
    }

    const channelId = await conversationChannelId(ctx, {
      integration,
      conversation,
    })

    return channelId === null
      ? null
      : {
          channelId,
          integration,
          threadTs: conversation.externalId,
        }
  },
})

async function conversationChannelId(
  ctx: QueryCtx,
  args: {
    integration: Doc<"integrations">
    conversation: Doc<"conversations">
  }
) {
  const message = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (query) =>
      query
        .eq("tenantId", args.conversation.tenantId)
        .eq("integrationId", args.integration._id)
        .eq("conversationId", args.conversation.externalId)
    )
    .order("desc")
    .first()

  return message === null ? null : (getSlackChannelId(message.data) ?? null)
}

async function slackReactionActorProfiles(
  ctx: ActionCtx,
  accountId: string,
  targets: ReactionSnapshotTarget[]
) {
  const actorIds = uniqueReactionActorIds(targets)
  const entries = await Promise.all(
    actorIds.map(async (actorId) => [
      actorId,
      await getSlackActorProfile(ctx, { accountId, actorId }),
    ])
  )

  return new Map(
    entries.filter(
      (entry): entry is [string, SlackActorProfile] => entry[1] !== undefined
    )
  )
}

function uniqueReactionActorIds(targets: ReactionSnapshotTarget[]) {
  const actorIds = new Set<string>()

  for (const target of targets) {
    for (const reaction of target.reactions) {
      const externalId = getActorExternalId(reaction.actor)

      if (externalId !== undefined) {
        actorIds.add(externalId)
      }
    }
  }

  return [...actorIds]
}

function applySlackReactionProfile(
  reaction: ReactionSnapshotItem,
  profiles: ReadonlyMap<string, SlackActorProfile>
): ReactionSnapshotItem {
  const externalId = getActorExternalId(reaction.actor)
  const profile =
    externalId === undefined ? undefined : profiles.get(externalId)

  if (profile === undefined) {
    return reaction
  }

  return {
    ...reaction,
    actor: createIntegrationActor({
      aliases: actorAliases(reaction.actor),
      email: profile.email,
      externalId,
      kind: actorKind(reaction.actor),
      name: profile.name,
    }),
  }
}

function actorKind(actor: Actor | undefined): ActorKind {
  return actor !== undefined && "externalId" in actor ? actor.kind : "person"
}

function actorAliases(actor: Actor | undefined): ActorAlias[] | undefined {
  return actor !== undefined && "externalId" in actor
    ? actor.aliases
    : undefined
}
