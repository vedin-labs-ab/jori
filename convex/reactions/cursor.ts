import { type RuntimeInteraction } from "../../contracts/runtime/context"
import { type Doc } from "../_generated/dataModel"
import {
  getActorDisplayName,
  getActorExternalId,
  getActorKind,
} from "../shared/actor"
import { type QueryLikeCtx } from "../shared/context"

export const defaultReactionDrainLimit = 20
const maxReactionDrainLimit = 50
const maxPendingReactionReadLimit = maxReactionDrainLimit + 1

type ReactionCursor = NonNullable<
  NonNullable<Doc<"sessions">["cursor"]>["reaction"]
>

type ReactionBatch = {
  cursor?: Doc<"reactions">
  hasMore: boolean
  reactions: Doc<"reactions">[]
}

export async function readPendingReactions(
  ctx: QueryLikeCtx,
  session: Doc<"sessions">,
  limit = defaultReactionDrainLimit
) {
  if (session.conversationId === undefined) {
    return { hasMore: false, reactions: [] }
  }

  const conversation = await ctx.db.get(session.conversationId)

  if (conversation === null) {
    return { hasMore: false, reactions: [] }
  }

  const takeLimit = Math.min(Math.max(1, limit), maxReactionDrainLimit)
  const candidates = await queryConversationReactions(ctx, {
    limit: maxPendingReactionReadLimit + 1,
    session,
    conversation,
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

  for (let index = 0; index < reactions.length; index += 1) {
    const reaction = reactions[index]

    if (!isAfterReactionCursor(reaction, session.cursor?.reaction)) {
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

export function formatRuntimeReaction(
  reaction: Doc<"reactions">
): RuntimeInteraction {
  const removed = reaction.removedAt !== undefined
  const observed =
    (removed ? reaction.removedAt : reaction.observedAt) ?? reaction.updatedAt

  return {
    actor: getActorDisplayName(reaction.actor) ?? null,
    actorIds: reactionActorIds(reaction),
    createdAt: reaction.createdAt,
    id: reaction._id,
    identifiers: reaction.target.identifiers,
    observedAt: observed,
    preview: reaction.target.text ?? null,
    reaction: reaction.reaction,
    source: getActorKind(reaction.actor),
    target: reactionTargetLabel(reaction),
    type: removed ? ("reaction.removed" as const) : ("reaction.added" as const),
  }
}

function reactionActorIds(reaction: Doc<"reactions">) {
  const externalId = getActorExternalId(reaction.actor)

  if (externalId === undefined || externalId === "") {
    return []
  }

  const kind = reaction.actor?.kind === "bot" ? "bot" : "user"

  return [`${reaction.integration}:${kind}:${externalId}`]
}

function reactionTargetLabel(reaction: Doc<"reactions">) {
  if (reaction.target.actor?.kind === "self") {
    return "Jori"
  }

  return getActorDisplayName(reaction.target.actor) ?? "message"
}

async function queryConversationReactions(
  ctx: QueryLikeCtx,
  args: {
    limit: number
    session: Doc<"sessions">
    conversation: Doc<"conversations">
  }
) {
  return await ctx.db
    .query("reactions")
    .withIndex(
      "by_organization_integration_target_conversation_updated",
      (query) => {
        const scoped = query
          .eq("organizationId", args.conversation.organizationId)
          .eq("integrationId", args.conversation.integrationId)
          .eq("target.conversationId", args.conversation.externalId)

        const cursor = args.session.cursor?.reaction

        return cursor === undefined
          ? scoped
          : scoped.gte("updatedAt", cursor.updatedAt)
      }
    )
    .order("asc")
    .take(args.limit)
}

function isAfterReactionCursor(
  reaction: Doc<"reactions">,
  cursor: ReactionCursor | undefined
) {
  if (cursor === undefined) {
    return true
  }

  if (reaction.updatedAt !== cursor.updatedAt) {
    return reaction.updatedAt > cursor.updatedAt
  }

  return reaction._creationTime > cursor.createdAt
}

function isRuntimeInputReaction(reaction: Doc<"reactions">) {
  return reaction.target.actor?.kind === "self"
}
