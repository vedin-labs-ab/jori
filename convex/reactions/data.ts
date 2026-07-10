import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { normalizeSelfActor } from "../messages/actor"
import { messageReactionTargetIdentifiers } from "../messages/identifiers"
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

export async function enrichReactionTarget(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    target: ReactionTarget
  }
): Promise<ReactionTarget> {
  const message = await findReactionTargetMessage(ctx, {
    integrationId: args.integration._id,
    targetKey: args.target.key,
  })

  if (message === null) {
    return args.target
  }

  return {
    ...args.target,
    actor: normalizeSelfActor(
      args.target.actor ?? message.actor,
      args.integration
    ),
    conversationId: message.conversationId ?? args.target.conversationId,
    identifiers: mergeIdentifiers(
      args.target.identifiers,
      messageReactionTargetIdentifiers(message)
    ),
    text: args.target.text ?? message.text,
  }
}

export function reactionActorKey(actor: Actor | undefined) {
  return (
    getActorExternalId(actor) ??
    getActorEmail(actor) ??
    getActorDisplayName(actor) ??
    "unknown"
  )
}

async function findReactionTargetMessage(
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

function mergeIdentifiers(left: string[], right: string[]) {
  return [...left, ...right].filter(
    (identifier, index, values) => values.indexOf(identifier) === index
  )
}
