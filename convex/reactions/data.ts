import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import {
  type Actor,
  getActorDisplayName,
  getActorEmail,
  getActorExternalId,
} from "../shared/actor"
import { type MessageIntegration } from "../shared/integrations"

export type ReactionAction = "added" | "removed"

export type ReactionTarget = {
  key: string
  identifiers: string[]
  actor?: Actor
  text?: string
  conversationId?: string
}

export type ReactionSnapshotItem = {
  reaction: string
  actor?: Actor
  observedAt?: number
}

export type ReactionSnapshotTarget = {
  target: ReactionTarget
  reactions: ReactionSnapshotItem[]
}

export type ReactionSnapshotPlan = {
  accountId: string
  integration: MessageIntegration
  targets: ReactionSnapshotTarget[]
}

export function reactionActorKey(actor: Actor | undefined) {
  return (
    getActorExternalId(actor) ??
    getActorEmail(actor) ??
    getActorDisplayName(actor) ??
    "unknown"
  )
}

export async function findReactionTargetMessage(
  ctx: MutationCtx,
  args: {
    integrationId: Id<"integrations">
    targetKey: string
  }
) {
  return await ctx.db
    .query("messages")
    .withIndex("by_integration_and_target", (query) =>
      query
        .eq("integrationId", args.integrationId)
        .eq("targetKey", args.targetKey)
    )
    .first()
}
