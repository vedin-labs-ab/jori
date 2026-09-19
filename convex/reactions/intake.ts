import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { findActiveIntegrationByExternalId } from "../integrations/data"
import { enrichReactionTarget } from "../integrations/messages/reactions"
import { screenWriter } from "../integrations/outsiders/screen"
import { actorValidator, isPersonActor } from "../shared/actor"
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

    const [reaction] = await memberReactions(ctx, {
      integration,
      provider: args.integration,
      reactions: [{ reaction: args.reaction, actor: args.actor }],
      target: args.target,
      attempt: "reaction",
    })

    if (reaction === undefined) {
      return { status: "outsider" as const }
    }

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

    const reactions = await memberReactions(ctx, {
      integration,
      provider: args.integration,
      reactions: args.reactions,
      target: args.target,
    })

    return {
      status: "synced" as const,
      ...(await reconcileTargetReactions(ctx, {
        integration,
        reactions,
        target: await enrichReactionTarget(ctx, {
          integration,
          target: args.target,
        }),
      })),
    }
  },
})

// A person's reaction counts only when a member left it; bots pass through.
// A snapshot replays what is already there, so it notes no attempt.
async function memberReactions(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    provider: MessageIntegration
    reactions: ReactionSnapshotItem[]
    target: ReactionTarget
    attempt?: "reaction"
  }
) {
  const kept: ReactionSnapshotItem[] = []

  for (const reaction of args.reactions) {
    if (
      !isPersonActor(reaction.actor) ||
      (await screenWriter(ctx, {
        integration: args.integration,
        provider: args.provider,
        actor: reaction.actor,
        attempt: args.attempt,
        conversationId: args.target.conversationId,
      })) !== undefined
    ) {
      kept.push(reaction)
    }
  }

  return kept
}
