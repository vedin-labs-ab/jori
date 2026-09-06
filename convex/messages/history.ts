import { readMessageContext } from "../../contracts/replies/answers"
import { type Doc } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { reactionSummariesForMessages } from "../reactions/summary"
import {
  type ActorKind,
  getActorDisplayName,
  getActorKind,
} from "../shared/actor"
import { createSight } from "../visibility/sight"
import { messageActorIds, messageIdentifiers } from "./identifiers"
import { consoleContextLine, resolveConsoleContext } from "./references"

const recentConversationLimit = 16

export type ConversationEntry = {
  actor: string | null
  actorIds: string[]
  /** What a console message was sent about, as one line for the model. */
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
}

export async function recentConversation(
  ctx: QueryCtx,
  message: Doc<"messages">
): Promise<RecentConversation> {
  const messages = await recentMessages(ctx, message)
  const reactions = await reactionSummariesForMessages(ctx, messages)
  const entries = await Promise.all(
    messages.map(async (entry) =>
      messageEntry(
        entry,
        reactions.get(entry._id),
        await messageContextLine(ctx, entry)
      )
    )
  )

  return {
    entries: mergeRecentConversation(entries),
    hasMoreMessages: messages.length > recentConversationLimit,
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
    .sort(
      (left, right) =>
        left.createdAt - right.createdAt || left.id.localeCompare(right.id)
    )
    .slice(-recentConversationLimit)
}

/** The line a console message's context makes, read as the person who
 *  sent it sees the target; nothing for a message sent about nothing. */
async function messageContextLine(ctx: QueryCtx, message: Doc<"messages">) {
  const context =
    message.surface === "console" ? readMessageContext(message.data) : undefined

  if (context === undefined) {
    return undefined
  }

  const sight = createSight(ctx, {
    organizationId: message.organizationId,
    personId: message.personId,
  })

  return consoleContextLine(
    context,
    await resolveConsoleContext(ctx, sight, message.data)
  )
}

async function recentMessages(ctx: QueryCtx, message: Doc<"messages">) {
  return await ctx.db
    .query("messages")
    .withIndex(
      "by_organization_and_integration_and_conversation_and_created_at",
      (query) =>
        query
          .eq("organizationId", message.organizationId)
          .eq("integrationId", message.integrationId)
          .eq("conversationId", message.conversationId)
    )
    .order("desc")
    .take(recentConversationLimit + 1)
}
