import { type Doc } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { reactionSummariesForMessages } from "../reactions/summary"
import { type ActorKind, getActorDisplayName } from "../shared/actor"
import { messageActorIds, messageIdentifiers } from "./identifiers"

const recentConversationLimit = 16

export type ConversationEntry = {
  actor: string | null
  actorIds: string[]
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
}

export async function recentConversation(
  ctx: QueryCtx,
  message: Doc<"messages">
): Promise<RecentConversation> {
  const messages = await recentMessages(ctx, message)
  const reactions = await reactionSummariesForMessages(ctx, messages)
  const entries = messages.map((entry) =>
    messageEntry(entry, reactions.get(entry._id))
  )

  return {
    entries: mergeRecentConversation(entries),
    hasMoreMessages: messages.length > recentConversationLimit,
  }
}

export function messageEntry(
  message: Doc<"messages">,
  reactions?: string
): ConversationEntry {
  return {
    actor: getActorDisplayName(message.actor) ?? null,
    actorIds: messageActorIds(message),
    createdAt: message.createdAt,
    id: message._id,
    identifiers: messageIdentifiers(message),
    observedAt: message.observedAt ?? null,
    reactions: reactions ?? null,
    source: message.actor?.kind ?? "unknown",
    text: message.text ?? "",
    type: message.type,
  }
}

export function mergeRecentConversation(entries: ConversationEntry[]) {
  return [...entries]
    .sort(
      (left, right) =>
        left.createdAt - right.createdAt || left.id.localeCompare(right.id)
    )
    .slice(-recentConversationLimit)
}

async function recentMessages(ctx: QueryCtx, message: Doc<"messages">) {
  return await ctx.db
    .query("messages")
    .withIndex(
      "by_tenant_and_integration_and_conversation_and_created_at",
      (query) =>
        query
          .eq("tenantId", message.tenantId)
          .eq("integrationId", message.integrationId)
          .eq("conversationId", message.conversationId)
    )
    .order("desc")
    .take(recentConversationLimit + 1)
}
