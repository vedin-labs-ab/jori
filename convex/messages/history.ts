import { type Doc } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { type ActorKind, getActorDisplayName } from "../shared/actor"
import { messageActorIds, messageIdentifiers } from "./identifiers"
import { messageText } from "./surface"

const recentConversationLimit = 16

export type ConversationEntry = {
  actor: string | null
  actorIds: string[]
  createdAt: number
  id: string
  identifiers: string[]
  observedAt: number | null
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
  message: Doc<"messages">,
  integration: Doc<"integrations">
): Promise<RecentConversation> {
  const messages =
    message.conversationId === undefined
      ? [message]
      : await recentMessages(ctx, message)
  const entries = messages.map((entry) => messageEntry(entry, integration))

  return {
    entries: mergeRecentConversation(entries),
    hasMoreMessages: messages.length > recentConversationLimit,
  }
}

export function messageEntry(
  message: Doc<"messages">,
  integration: Doc<"integrations">
): ConversationEntry {
  return {
    actor: getActorDisplayName(message.actor) ?? null,
    actorIds: messageActorIds(message),
    createdAt: message.createdAt,
    id: message._id,
    identifiers: messageIdentifiers(message),
    observedAt: message.observedAt ?? null,
    source: message.actor?.kind ?? "unknown",
    text: messageText(message, integration),
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
  const conversationId = message.conversationId

  if (conversationId === undefined) {
    return [message]
  }

  return await ctx.db
    .query("messages")
    .withIndex("by_conversation", (query) =>
      query
        .eq("tenantId", message.tenantId)
        .eq("integrationId", message.integrationId)
        .eq("conversationId", conversationId)
    )
    .order("desc")
    .take(recentConversationLimit + 1)
}
