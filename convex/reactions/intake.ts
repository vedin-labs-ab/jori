import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import { actorValidator } from "../shared/actor"
import {
  findActiveReactionIntegration,
  type ReactionIntegration,
  recordReaction,
} from "./data"
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
    key: v.string(),
    action: reactionAction,
    reaction: v.string(),
    actor: v.optional(actorValidator),
    target: reactionTarget,
    observedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const integration = await findActiveReactionIntegration(ctx, {
      accountId: args.accountId,
      integration: args.integration as ReactionIntegration,
    })

    if (integration === null) {
      return { status: "missing_integration" as const }
    }

    const result = await recordReaction(ctx, {
      integration,
      key: args.key,
      action: args.action,
      reaction: args.reaction,
      actor: args.actor,
      target: args.target,
      observedAt: args.observedAt,
    })

    return {
      status: result.status,
      reactionId: result.reactionId,
    }
  },
})
