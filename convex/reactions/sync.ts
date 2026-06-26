import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import {
  type Actor,
  getActorDisplayName,
  getActorExternalId,
} from "../shared/actor"
import { type ReactionTarget, recordReaction } from "./data"

const maxReactionSyncEventsPerTarget = 500

export type ReactionSnapshotItem = {
  key: string
  reaction: string
  actor?: Actor
  observedAt?: number
}

export async function syncReactionSnapshot(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    reactions: ReactionSnapshotItem[]
    target: ReactionTarget
  }
) {
  const existing = await reactionEventsForTarget(ctx, {
    integrationId: args.integration._id,
    targetKey: args.target.key,
  })
  const active = activeReactionEvents(existing)
  const current = currentReactionEvents(args.reactions)
  let recorded = 0

  for (const currentReaction of current.values()) {
    if (active.has(reactionIdentity(currentReaction))) {
      continue
    }

    const result = await recordReaction(ctx, {
      integration: args.integration,
      key: reactionEventKey(currentReaction.key, "added"),
      action: "added",
      reaction: currentReaction.reaction,
      actor: currentReaction.actor,
      target: args.target,
      observedAt: currentReaction.observedAt,
    })

    if (result.status === "recorded") {
      recorded += 1
    }
  }

  for (const [identity, activeReaction] of active) {
    if (current.has(identity)) {
      continue
    }

    const result = await recordReaction(ctx, {
      integration: args.integration,
      key: removalEventKey(activeReaction),
      action: "removed",
      reaction: activeReaction.reaction,
      actor: activeReaction.actor,
      target: args.target,
    })

    if (result.status === "recorded") {
      recorded += 1
    }
  }

  return {
    active: current.size,
    recorded,
  }
}

async function reactionEventsForTarget(
  ctx: MutationCtx,
  target: {
    integrationId: Doc<"integrations">["_id"]
    targetKey: string
  }
) {
  return await ctx.db
    .query("reactions")
    .withIndex("by_integration_and_target", (query) =>
      query
        .eq("integrationId", target.integrationId)
        .eq("targetKey", target.targetKey)
    )
    .order("desc")
    .take(maxReactionSyncEventsPerTarget)
}

function activeReactionEvents(reactions: Doc<"reactions">[]) {
  const latest = new Map<string, Doc<"reactions">>()

  for (const reaction of reactions) {
    const identity = reactionIdentity(reaction)

    if (!latest.has(identity)) {
      latest.set(identity, reaction)
    }
  }

  return new Map(
    [...latest.entries()].filter(([, reaction]) => reaction.action === "added")
  )
}

function currentReactionEvents(reactions: ReactionSnapshotItem[]) {
  const current = new Map<string, ReactionSnapshotItem>()

  for (const reaction of reactions) {
    current.set(reactionIdentity(reaction), reaction)
  }

  return current
}

function reactionIdentity(reaction: {
  actor?: Actor
  key: string
  reaction: string
}) {
  return [
    getActorExternalId(reaction.actor) ??
      getActorDisplayName(reaction.actor) ??
      reaction.key,
    reaction.reaction,
  ].join(":")
}

function removalEventKey(reaction: Doc<"reactions">) {
  return reaction.key.endsWith(":added")
    ? `${reaction.key.slice(0, -":added".length)}:removed`
    : `${reaction.key}:removed`
}

function reactionEventKey(key: string, action: "added" | "removed") {
  return key.endsWith(`:${action}`) ? key : `${key}:${action}`
}
