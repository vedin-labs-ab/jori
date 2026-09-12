import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import { findActiveIntegrationByExternalId } from "../integrations/data"
import { enrichReactionTarget } from "../integrations/messages/reactions"
import { resolveActor } from "../persons/resolve"
import { actorValidator } from "../shared/actor"
import {
  type MessageIntegration,
  messageIntegrationValidator,
} from "../shared/integrations"
import { reconcileTargetReactions, recordReactionEvent } from "./apply"
import { type ReactionSnapshotItem, type ReactionTarget } from "./data"
import { reactionAction, reactionTarget } from "./schema"

export const record = internalMutation({
  args: {
    accountId: v.string(),
    integration: messageIntegrationValidator,
    expectedConnectionGeneration: v.optional(v.number()),
    action: reactionAction,
    reaction: v.string(),
    actor: v.optional(actorValidator),
    target: reactionTarget,
    observedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      externalId: args.accountId,
      integration: args.integration,
    })

    if (
      integration === null ||
      (args.expectedConnectionGeneration !== undefined &&
        (integration.connectionGeneration ?? 0) !==
          args.expectedConnectionGeneration)
    ) {
      return { status: "missing_integration" as const }
    }

    await resolveReactionActors(ctx, {
      actor: args.actor,
      integration,
      provider: args.integration,
      target: args.target,
    })
    const result = await recordReactionEvent(ctx, {
      action: args.action,
      actor: args.actor,
      integration,
      observedAt: args.observedAt,
      reaction: args.reaction,
      target: await enrichReactionTarget(ctx, {
        integration,
        target: args.target,
      }),
    })

    return { status: "recorded" as const, recorded: result.recorded }
  },
})

export const sync = internalMutation({
  args: {
    accountId: v.string(),
    integration: messageIntegrationValidator,
    target: reactionTarget,
    reactions: v.array(
      v.object({
        reaction: v.string(),
        actor: v.optional(actorValidator),
        observedAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const integration = await findActiveIntegrationByExternalId(ctx, {
      externalId: args.accountId,
      integration: args.integration,
    })

    if (integration === null) {
      return { status: "missing_integration" as const }
    }

    await resolveReactionActors(ctx, {
      integration,
      provider: args.integration,
      reactions: args.reactions,
      target: args.target,
    })

    return {
      status: "synced" as const,
      ...(await reconcileTargetReactions(ctx, {
        integration,
        reactions: args.reactions,
        target: await enrichReactionTarget(ctx, {
          integration,
          target: args.target,
        }),
      })),
    }
  },
})

async function resolveReactionActors(
  ctx: Parameters<typeof resolveActor>[0],
  args: {
    actor?: ReactionSnapshotItem["actor"]
    integration: NonNullable<
      Awaited<ReturnType<typeof findActiveIntegrationByExternalId>>
    >
    provider: MessageIntegration
    reactions?: ReactionSnapshotItem[]
    target: ReactionTarget
  }
) {
  const actors = [
    args.actor,
    args.target.actor,
    ...(args.reactions ?? []).map((reaction) => reaction.actor),
  ]

  for (const actor of actors) {
    await resolveActor(ctx, {
      actor,
      provider: args.provider,
      organizationId: args.integration.organizationId,
    })
  }
}
