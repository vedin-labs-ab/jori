import { type Doc } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { messageReactionTargetKey } from "../messages/identifiers"
import { getActorDisplayName, getActorExternalId } from "../shared/actor"

const maxReactionEventsPerTarget = 200
const maxReactionGroups = 3
const maxActorNames = 2

type QueryLikeCtx = MutationCtx | QueryCtx

type ActiveReaction = {
  actor: string
  reaction: string
}

export async function reactionSummariesForMessages(
  ctx: QueryLikeCtx,
  messages: Doc<"messages">[]
) {
  const result = new Map<string, string>()
  const targets = uniqueMessageTargets(messages)

  for (const target of targets) {
    const reactions = await reactionsForTarget(ctx, target)
    const summary = formatReactionSummary(activeReactions(reactions))

    if (summary !== null) {
      for (const messageId of target.messageIds) {
        result.set(messageId, summary)
      }
    }
  }

  return result
}

function uniqueMessageTargets(messages: Doc<"messages">[]) {
  const targets = new Map<
    string,
    {
      integrationId: Doc<"messages">["integrationId"]
      key: string
      messageIds: string[]
    }
  >()

  for (const message of messages) {
    const key = messageReactionTargetKey(message)

    if (key === undefined) {
      continue
    }

    const mapKey = `${message.integrationId}:${key}`
    const target = targets.get(mapKey)

    if (target === undefined) {
      targets.set(mapKey, {
        integrationId: message.integrationId,
        key,
        messageIds: [message._id],
      })
      continue
    }

    target.messageIds.push(message._id)
  }

  return [...targets.values()]
}

async function reactionsForTarget(
  ctx: QueryLikeCtx,
  target: {
    integrationId: Doc<"messages">["integrationId"]
    key: string
  }
) {
  return await ctx.db
    .query("reactions")
    .withIndex("by_integration_and_target", (query) =>
      query
        .eq("integrationId", target.integrationId)
        .eq("targetKey", target.key)
    )
    .order("desc")
    .take(maxReactionEventsPerTarget)
}

function activeReactions(reactions: Doc<"reactions">[]) {
  const latest = new Map<string, Doc<"reactions">>()

  for (const reaction of reactions) {
    const key = `${actorKey(reaction)}:${reaction.reaction}`

    if (!latest.has(key)) {
      latest.set(key, reaction)
    }
  }

  return [...latest.values()]
    .filter((reaction) => reaction.action === "added")
    .map((reaction) => ({
      actor: getActorDisplayName(reaction.actor) ?? "unknown",
      reaction: reaction.reaction,
    }))
}

function actorKey(reaction: Doc<"reactions">) {
  return (
    getActorExternalId(reaction.actor) ??
    getActorDisplayName(reaction.actor) ??
    reaction.key
  )
}

function formatReactionSummary(reactions: ActiveReaction[]) {
  if (reactions.length === 0) {
    return null
  }

  const groups = reactionGroups(reactions)
  const visible = groups.slice(0, maxReactionGroups)
  const overflow = groups.length - visible.length
  const parts = visible.map(formatReactionGroup)

  if (overflow > 0) {
    parts.push(`+${overflow} more`)
  }

  return parts.join(", ")
}

function reactionGroups(reactions: ActiveReaction[]) {
  const groups = new Map<string, string[]>()

  for (const reaction of reactions) {
    groups.set(reaction.reaction, [
      ...(groups.get(reaction.reaction) ?? []),
      reaction.actor,
    ])
  }

  return [...groups.entries()]
    .map(([reaction, actors]) => ({
      actors,
      count: actors.length,
      reaction,
    }))
    .sort(
      (left, right) =>
        right.count - left.count || left.reaction.localeCompare(right.reaction)
    )
}

function formatReactionGroup(group: {
  actors: string[]
  count: number
  reaction: string
}) {
  return `${group.reaction} x${group.count} (${formatActors(group.actors)})`
}

function formatActors(actors: string[]) {
  const visible = actors.slice(0, maxActorNames)
  const overflow = actors.length - visible.length

  return overflow === 0
    ? visible.join(", ")
    : [...visible, `+${overflow}`].join(", ")
}
