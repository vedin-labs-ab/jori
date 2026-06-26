import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { messageReactionTargetIdentifiers } from "../messages/identifiers"
import { isGitHubSelfActor } from "../providers/github/data"
import { getLinearBotId } from "../providers/linear/data"
import { getSlackBotUserId } from "../providers/slack/data"
import { type Actor, getActorExternalId, withActorKind } from "../shared/actor"
import { type Integration } from "../shared/integrations"

export type ReactionAction = "added" | "removed"
export type ReactionIntegration = "github" | "linear" | "slack"

export type ReactionTarget = {
  key: string
  identifiers: string[]
  actor?: Actor
  text?: string
  conversationId?: string
}

export async function findActiveReactionIntegration(
  ctx: MutationCtx,
  args: {
    accountId: string
    integration: ReactionIntegration
  }
) {
  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_integration_and_external", (query) =>
      query.eq("integration", args.integration).eq("externalId", args.accountId)
    )
    .first()

  if (integration === null || integration.status !== "active") {
    return null
  }

  return integration
}

export async function recordReaction(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    key: string
    action: ReactionAction
    reaction: string
    actor?: Actor
    target: ReactionTarget
    observedAt?: number
  }
): Promise<
  | { status: "duplicate"; reactionId: Id<"reactions"> }
  | { status: "recorded"; reactionId: Id<"reactions"> }
> {
  const existing = await ctx.db
    .query("reactions")
    .withIndex("by_integration_and_key", (query) =>
      query.eq("integrationId", args.integration._id).eq("key", args.key)
    )
    .first()

  if (existing !== null) {
    return { status: "duplicate", reactionId: existing._id }
  }

  const target = await enrichReactionTarget(ctx, {
    integration: args.integration,
    target: args.target,
  })
  const reactionId = await ctx.db.insert("reactions", {
    tenantId: args.integration.tenantId,
    integrationId: args.integration._id,
    integration: args.integration.integration,
    key: args.key,
    action: args.action,
    reaction: args.reaction,
    actor: args.actor,
    targetKey: target.key,
    targetIdentifiers: target.identifiers,
    targetActor: normalizeTargetActor(target.actor, args.integration),
    targetText: target.text,
    targetMessageId: target.messageId,
    conversationId: target.conversationId,
    observedAt: args.observedAt,
    createdAt: Date.now(),
  })

  return { status: "recorded", reactionId }
}

async function enrichReactionTarget(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    target: ReactionTarget
  }
) {
  const message = await findReactionTargetMessage(ctx, {
    integrationId: args.integration._id,
    targetKey: args.target.key,
  })

  if (message === null) {
    return { ...args.target, messageId: undefined }
  }

  return {
    ...args.target,
    actor: args.target.actor ?? message.actor,
    conversationId: message.conversationId ?? args.target.conversationId,
    identifiers: mergeIdentifiers(
      args.target.identifiers,
      messageReactionTargetIdentifiers(message)
    ),
    messageId: message._id,
    text: args.target.text ?? message.text,
  }
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

function normalizeTargetActor(
  actor: Actor | undefined,
  integration: Pick<Doc<"integrations">, "data" | "integration">
) {
  if (isGitHubSelfActor(actor, integration)) {
    return withActorKind(actor, "self")
  }

  const actorId = getActorExternalId(actor)
  const selfId = selfActorId(integration)

  return actorId !== undefined && actorId === selfId
    ? withActorKind(actor, "self")
    : actor
}

function selfActorId(
  integration: Pick<Doc<"integrations">, "data" | "integration">
) {
  if (integration.integration === "slack") {
    return getSlackBotUserId(integration.data)
  }

  if (integration.integration === "linear") {
    return getLinearBotId(integration.data)
  }

  return undefined
}

export function isReactionIntegration(
  integration: Integration
): integration is ReactionIntegration {
  return (
    integration === "github" ||
    integration === "linear" ||
    integration === "slack"
  )
}
