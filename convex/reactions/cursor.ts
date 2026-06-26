import { type Doc } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { getActorDisplayName, getActorExternalId } from "../shared/actor"

export const defaultReactionDrainLimit = 20
export const maxReactionDrainLimit = 50
export const maxPendingReactionReadLimit = maxReactionDrainLimit + 1

type QueryLikeCtx = MutationCtx | QueryCtx

export type ReactionBatch = {
  cursor?: Doc<"reactions">
  hasMore: boolean
  reactions: Doc<"reactions">[]
}

export async function readPendingReactions(
  ctx: QueryLikeCtx,
  session: Doc<"sessions">,
  limit = defaultReactionDrainLimit
) {
  const watch = await ctx.db.get(session.watchId)

  if (watch === null) {
    return { hasMore: false, reactions: [] }
  }

  const takeLimit = Math.min(Math.max(1, limit), maxReactionDrainLimit)
  const candidates = await queryConversationReactions(ctx, {
    limit: maxPendingReactionReadLimit + 1,
    session,
    watch,
  })
  const scanned = candidates.slice(0, maxPendingReactionReadLimit)

  return collectPendingReactionBatch(
    scanned,
    session,
    takeLimit,
    candidates.length > maxPendingReactionReadLimit
  )
}

export function collectPendingReactionBatch(
  reactions: Doc<"reactions">[],
  session: Doc<"sessions">,
  limit: number,
  hasMore: boolean
): ReactionBatch {
  const pending: Doc<"reactions">[] = []
  let cursor: Doc<"reactions"> | undefined
  let seenLastReaction = session.reactionCursor === undefined

  for (let index = 0; index < reactions.length; index += 1) {
    const reaction = reactions[index]

    if (reaction._id === session.reactionCursor?.reactionId) {
      seenLastReaction = true
      continue
    }

    if (!isAfterReactionCursor(reaction, session, seenLastReaction)) {
      continue
    }

    cursor = reaction

    if (isRuntimeInputReaction(reaction)) {
      pending.push(reaction)
    }

    if (pending.length === limit) {
      return {
        cursor,
        hasMore: hasMore || index < reactions.length - 1,
        reactions: pending,
      }
    }
  }

  return { cursor, hasMore, reactions: pending }
}

export function formatRuntimeReaction(reaction: Doc<"reactions">) {
  const observed = reaction.observedAt ?? reaction.createdAt

  return {
    actor: getActorDisplayName(reaction.actor) ?? null,
    actorIds: reactionActorIds(reaction),
    createdAt: reaction.createdAt,
    id: reaction._id,
    identifiers: reaction.targetIdentifiers,
    observedAt: observed,
    preview: reaction.targetText ?? null,
    reaction: reaction.reaction,
    source: reaction.actor?.kind ?? "unknown",
    target: reactionTargetLabel(reaction),
    type: `reaction.${reaction.action}` as const,
  }
}

function reactionActorIds(reaction: Doc<"reactions">) {
  const externalId = getActorExternalId(reaction.actor)

  if (externalId === undefined || externalId === "") {
    return []
  }

  if (reaction.integration === "linear") {
    return [
      `linear:${reaction.actor?.kind === "bot" ? "bot" : "user"}:${externalId}`,
    ]
  }

  if (reaction.integration === "slack") {
    return [
      `slack:${reaction.actor?.kind === "bot" ? "bot" : "user"}:${externalId}`,
    ]
  }

  if (reaction.integration === "github") {
    return [
      `github:${reaction.actor?.kind === "bot" ? "bot" : "user"}:${externalId}`,
    ]
  }

  return []
}

function reactionTargetLabel(reaction: Doc<"reactions">) {
  const targetActor = getActorDisplayName(reaction.targetActor)

  if (reaction.targetActor?.kind === "self") {
    return "Milo"
  }

  return targetActor ?? "message"
}

async function queryConversationReactions(
  ctx: QueryLikeCtx,
  args: {
    limit: number
    session: Doc<"sessions">
    watch: Doc<"watches">
  }
) {
  return await ctx.db
    .query("reactions")
    .withIndex("by_conversation_and_created", (query) => {
      const scoped = query
        .eq("tenantId", args.watch.tenantId)
        .eq("integrationId", args.watch.integrationId)
        .eq("conversationId", args.watch.externalId)

      return args.session.reactionCursor === undefined
        ? scoped
        : scoped.gte("createdAt", args.session.reactionCursor.timestamp)
    })
    .order("asc")
    .take(args.limit)
}

function isAfterReactionCursor(
  reaction: Doc<"reactions">,
  session: Doc<"sessions">,
  seenLastReaction: boolean
) {
  const cursor = session.reactionCursor

  if (cursor === undefined) {
    return true
  }

  if (reaction.createdAt < cursor.timestamp) {
    return false
  }

  return reaction.createdAt !== cursor.timestamp || seenLastReaction
}

function isRuntimeInputReaction(reaction: Doc<"reactions">) {
  return reaction.targetActor?.kind === "self"
}
