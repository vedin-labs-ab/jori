import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import {
  messageActorIds,
  messageIdentifiers,
} from "../../integrations/messages/identifiers"
import { messageContextLine } from "../../messages/context"
import { reactionSummariesForMessages } from "../../reactions/summary"
import {
  type ExecutionPrincipal,
  executionPrincipalPersonId,
} from "../../runs/principal"
import {
  type ActorKind,
  getActorDisplayName,
  getActorKind,
} from "../../shared/actor"
import { createSight } from "../../visibility/sight"
import { createConversationSight } from "../access"
import { findMessageConversation } from "../resolve"

const recentConversationLimit = 16

export type ConversationEntry = {
  actor: string | null
  actorIds: string[]
  /** What a console message was sent about and what its text mentions,
   *  as a line each for the model. */
  context: string | null
  createdAt: number
  id: string
  identifiers: string[]
  observedAt: number | null
  reactions: string | null
  source: ActorKind | "unknown"
  text: string
  type: string
}

export type RecentConversation = {
  entries: ConversationEntry[]
  hasMoreMessages: boolean
  /** The conversation's rolling summary, standing in for the messages the
   *  recent window no longer holds. */
  summary: string | null
}

export async function recentConversation(
  ctx: QueryCtx,
  message: Doc<"messages">,
  principal: ExecutionPrincipal
): Promise<RecentConversation> {
  const conversation = await findMessageConversation(ctx, message)
  const sight =
    conversation?.surface === "console"
      ? createConversationSight(ctx, conversation)
      : createSight(ctx, {
          organizationId: message.organizationId,
          personId: executionPrincipalPersonId(principal),
        })
  const messages = await recentMessages(ctx, message)
  const reactions = await reactionSummariesForMessages(ctx, messages)
  const entries = await Promise.all(
    messages
      .reverse()
      .map(async (entry) =>
        messageEntry(
          entry,
          reactions.get(entry._id),
          await messageContextLine(ctx, entry, sight)
        )
      )
  )

  return {
    entries: mergeRecentConversation(entries),
    hasMoreMessages: messages.length > recentConversationLimit,
    summary: conversation?.summary ?? null,
  }
}

export function messageEntry(
  message: Doc<"messages">,
  reactions?: string,
  context?: string
): ConversationEntry {
  return {
    actor: getActorDisplayName(message.actor) ?? null,
    actorIds: messageActorIds(message),
    context: context ?? null,
    createdAt: message.createdAt,
    id: message._id,
    identifiers: messageIdentifiers(message),
    observedAt: message.observedAt ?? null,
    reactions: reactions ?? null,
    source: getActorKind(message.actor),
    text: message.text ?? "",
    type: message.type,
  }
}

export function mergeRecentConversation(entries: ConversationEntry[]) {
  return [...entries]
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(-recentConversationLimit)
}

/** The initial prompt ends at its triggering message. Later arrivals enter
 * through the session cursor, once, rather than also appearing in history. */
async function recentMessages(ctx: QueryCtx, message: Doc<"messages">) {
  return await ctx.db
    .query("messages")
    .withIndex("by_conversation", (query) =>
      query
        .eq("organizationId", message.organizationId)
        .eq("integrationId", message.integrationId)
        .eq("conversationId", message.conversationId)
        .lte("_creationTime", message._creationTime)
    )
    .order("desc")
    .take(recentConversationLimit + 1)
}
