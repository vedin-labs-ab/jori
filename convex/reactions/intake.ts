import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import { actorValidator } from "../shared/actor"
import { reconcileTargetReactions, recordReactionEvent } from "./apply"
import { findActiveReactionIntegration } from "./data"
import { reactionAction } from "./schema"

const reactionIntegration = v.union(
  v.literal("github"),
  v.literal("linear"),
  v.literal("slack")
)

const reactionTarget = v.object({
  key: v.string(),
  identifiers: v.array(v.string()),
  actor: v.optional(actorValidator),
  text: v.optional(v.string()),
  conversationId: v.optional(v.string()),
})

export const record = internalMutation({
  args: {
    accountId: v.string(),
    integration: reactionIntegration,
    action: reactionAction,
    reaction: v.string(),
    actor: v.optional(actorValidator),
    target: reactionTarget,
    observedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const integration = await findActiveReactionIntegration(ctx, {
      accountId: args.accountId,
      integration: args.integration,
    })

    if (integration === null) {
      return { status: "missing_integration" as const }
    }

    const result = await recordReactionEvent(ctx, {
      action: args.action,
      actor: args.actor,
      integration,
      observedAt: args.observedAt,
      reaction: args.reaction,
      target: args.target,
    })

    return { status: "recorded" as const, recorded: result.recorded }
  },
})

export const sync = internalMutation({
  args: {
    accountId: v.string(),
    integration: reactionIntegration,
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
    const integration = await findActiveReactionIntegration(ctx, {
      accountId: args.accountId,
      integration: args.integration,
    })

    if (integration === null) {
      return { status: "missing_integration" as const }
    }

    return {
      status: "synced" as const,
      ...(await reconcileTargetReactions(ctx, {
        integration,
        reactions: args.reactions,
        target: args.target,
      })),
    }
  },
})
